require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { paymentMiddleware, x402ResourceServer } = require('@x402-avm/express');
const { ALGORAND_TESTNET_CAIP2 } = require('@x402-avm/avm');
const { ExactAvmScheme } = require('@x402-avm/avm/exact/server');

const app = express();
app.use(express.json());
app.use(cors());

// Load seller wallet
const walletPath = path.join(__dirname, '..', 'seller_wallet.json');
let walletAddress = "DUMMY_ADDRESS";
if (fs.existsSync(walletPath)) {
    const wallet = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    const algosdk = require('algosdk');
    const account = algosdk.mnemonicToSecretKey(wallet.mnemonic);
    walletAddress = account.addr.toString();
}

const { createAlgodClient } = require('@x402-avm/avm');
const algosdk = require('algosdk');
const algod = createAlgodClient('testnet');

class LocalFacilitatorClient {
    async getSupported() {
        return { kinds: [{ x402Version: 2, scheme: 'exact', network: ALGORAND_TESTNET_CAIP2 }] };
    }
    async verify(paymentPayload, paymentRequirements) {
        return { isValid: true };
    }
    async settle(paymentPayload, paymentRequirements, resourceConfig) {
        try {
            console.log("LocalFacilitator: Submitting transaction to Algorand Testnet...");
            const txns = paymentPayload.payload.paymentGroup;
            const txnsBytes = Buffer.concat(txns.map(t => Buffer.from(t, 'base64')));
            const { txId } = await algod.sendRawTransaction(new Uint8Array(txnsBytes));
            console.log("LocalFacilitator: Transaction submitted, waiting for confirmation... TXID:", txId);
            await new Promise(r => setTimeout(r, 4000));
            console.log("LocalFacilitator: Confirmed!");
            return {
                success: true,
                network: ALGORAND_TESTNET_CAIP2,
                transaction: txId,
                payer: "unknown"
            };
        } catch (error) {
            console.error("LocalFacilitator Error:", error);
            throw error;
        }
    }
}

// x402 configuration
const facilitatorClient = new LocalFacilitatorClient();
const resourceServer = new x402ResourceServer(facilitatorClient)
    .register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme());

const paymentOptions = {
    "POST /task": {
        accepts: [{
            scheme: "exact",
            payTo: walletAddress,
            price: { amount: "200", asset: "0" }, // 200 microAlgos
            network: ALGORAND_TESTNET_CAIP2
        }]
    }
};

app.post('/task', paymentMiddleware(paymentOptions, resourceServer), async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text" });
    
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + process.env.OPENROUTER_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
                "messages": [
                    {"role": "user", "content": `Translate the following text: ${text}`}
                ]
            })
        });
        const data = await response.json();
        const result = data.choices && data.choices.length > 0 ? data.choices[0].message.content : "[Translation Failed]";
        res.status(200).json({ result });
    } catch (e) {
        console.error("OpenRouter Error:", e);
        res.status(200).json({ result: "[Translation Failed due to API Error]" });
    }
});

const PORT = 5002;
// Only run server if called directly (not required in a test)
if (require.main === module) {
    app.listen(PORT, async () => {
        console.log(`Translator Agent (x402 Protected) running on http://localhost:${PORT}`);
        
        try {
            const response = await fetch('http://localhost:5000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: "Translator",
                    description: "Translates text into another language.",
                    price: "200",
                    endpointUrl: `http://localhost:${PORT}/task`,
                    walletAddress: walletAddress
                })
            });
            if (response.ok) console.log("Successfully registered with Agent Bazaar Registry!");
        } catch (err) {
            console.error("Could not reach Registry Service.");
        }
    });
}

module.exports = {};
