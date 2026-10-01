const algosdk = require('algosdk');
const fs = require('fs');
const { x402Client, x402HTTPClient } = require('@x402-avm/core/client');
const { ALGORAND_TESTNET_CAIP2, toClientAvmSigner, createAlgodClient } = require('@x402-avm/avm');
const { ExactAvmScheme } = require('@x402-avm/avm/exact/client');

async function runIntegrationTest() {
    console.log("=== x402 Payment Loop Integration Test ===");
    
    // Load Buyer Wallet
    const walletFile = fs.readFileSync('buyer_wallet.json', 'utf8');
    const { mnemonic } = JSON.parse(walletFile);
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    
    // Setup Algod client
    const algod = createAlgodClient('testnet');
    
    // Get initial balance
    const initialAccountInfo = await algod.accountInformation(account.addr);
    const initialBalance = initialAccountInfo.amount;
    console.log(`-> Initial Buyer Balance: ${Number(initialBalance) / 1_000_000} ALGO`);
    
    const privateKeyBase64 = Buffer.from(account.sk).toString('base64');
    const signer = toClientAvmSigner(privateKeyBase64);
    
    const coreClient = new x402Client().register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(signer));
    const httpClient = new x402HTTPClient(coreClient);
        
    console.log("Sending initial POST to Summarizer... (Expecting 402)");
    try {
        const reqOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: "This is a real test. We are paying for this." })
        };
        const response = await fetch('http://localhost:5001/task', reqOptions);
        
        if (response.status === 402) {
            console.log("-> Caught 402 Payment Required!");
            console.log("-> Processing payment automatically (fetching invoice, signing, submitting)...");
            
            const paymentRequired = httpClient.getPaymentRequiredResponse(name => response.headers.get(name));
            const payload = await httpClient.createPaymentPayload(paymentRequired);
            const signatureHeaders = httpClient.encodePaymentSignatureHeader(payload);
            
            reqOptions.headers = { ...reqOptions.headers, ...signatureHeaders };
            
            // Re-fetch using the generated headers
            const paidResponse = await fetch('http://localhost:5001/task', reqOptions);
            
            console.log(`-> Payment completed. New status: ${paidResponse.status}`);
            console.log(`-> Payment Error Header: ${paidResponse.headers.get('PAYMENT-REQUIRED')}`);
            if (paidResponse.headers.get('PAYMENT-REQUIRED')) {
                const headerValue = paidResponse.headers.get('PAYMENT-REQUIRED');
                const decoded = JSON.parse(Buffer.from(headerValue, 'base64').toString('utf8'));
                console.log(`-> Decoded Error: ${JSON.stringify(decoded, null, 2)}`);
            }
            const data = await paidResponse.json();
            console.log("-> Result:", data);
            
            // Get final balance
            const finalAccountInfo = await algod.accountInformation(account.addr);
            const finalBalance = finalAccountInfo.amount;
            console.log(`-> Final Buyer Balance: ${Number(finalBalance) / 1_000_000} ALGO`);
            console.log(`-> Total Spent (Price + Network Fees): ${Number(initialBalance - finalBalance) / 1_000_000} ALGO`);
            
        } else {
            console.log(`-> Unexpected status: ${response.status}`);
            console.log(await response.text());
        }
    } catch (err) {
        console.error("Test failed:", err);
    }
}

runIntegrationTest();
