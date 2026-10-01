const readline = require('readline');
const fs = require('fs');
const { x402Client, x402HTTPClient } = require('@x402-avm/core/client');
const { ALGORAND_TESTNET_CAIP2, toClientAvmSigner, decodePrivateKey } = require('@x402-avm/avm');
const { ExactAvmScheme } = require('@x402-avm/avm/exact/client');
const algosdk = require('algosdk');

// --- Initialization ---
const buyerWalletStr = fs.readFileSync('buyer_wallet.json', 'utf8');
const buyerWallet = JSON.parse(buyerWalletStr);
const buyerAccount = algosdk.mnemonicToSecretKey(buyerWallet.mnemonic);
const privateKeyBase64 = Buffer.from(buyerAccount.sk).toString('base64');
const signer = toClientAvmSigner(privateKeyBase64);

const core = new x402Client().register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(signer));
const httpClient = new x402HTTPClient(core);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

// --- Registry Lookup ---
async function findAgent(intent) {
    let serviceKeyword = "";
    if (intent.toLowerCase().includes("translat")) serviceKeyword = "translator";
    else if (intent.toLowerCase().includes("summar")) serviceKeyword = "summarizer";
    else return null;

    try {
        const res = await fetch('http://localhost:5000/agents');
        const agents = await res.json();

        // Find match
        return agents.find(a => a.name.toLowerCase().includes(serviceKeyword) || a.description.toLowerCase().includes(serviceKeyword));
    } catch (e) {
        console.error("Error communicating with registry:", e.message);
        return null;
    }
}

// --- Payment & Execution Loop ---
async function updateTaskStatus(taskId, status) {
    if (!taskId) return;
    try {
        await fetch(`http://localhost:5000/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
    } catch (e) { }
}

async function executeTask(agent, text, taskId) {
    console.log(`\n[Orchestrator] Sending task to ${agent.name} at ${agent.endpointUrl}...`);

    let reqOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    };

    try {
        let response = await fetch(agent.endpointUrl, reqOptions);

        if (response.status === 402) {
            console.log(`[Orchestrator] 402 Payment Required intercepted.`);
            console.log(`[Orchestrator] Processing payment automatically...`);

            const paymentRequired = httpClient.getPaymentRequiredResponse(name => response.headers.get(name));

            console.log(`[Orchestrator] Signing transactions...`);
            const payload = await httpClient.createPaymentPayload(paymentRequired);

            const signatureHeaders = httpClient.encodePaymentSignatureHeader(payload);
            reqOptions.headers = { ...reqOptions.headers, ...signatureHeaders };

            await updateTaskStatus(taskId, 'Processing (Paid)');
            console.log(`[Orchestrator] Submitting signed payment and retrying task...`);
            const paidResponse = await fetch(agent.endpointUrl, reqOptions);

            if (paidResponse.status === 200) {
                console.log(`[Orchestrator] Payment accepted! Task completed successfully.`);
                await updateTaskStatus(taskId, 'Completed');
                const data = await paidResponse.json();
                return data.result;
            } else {
                console.error(`[Orchestrator] Payment failed or rejected. Status: ${paidResponse.status}`);
                const errorData = await paidResponse.text();
                console.error(`Response: ${errorData}`);
                return null;
            }
        } else if (response.status === 200) {
            console.log(`[Orchestrator] Task completed without requiring payment.`);
            await updateTaskStatus(taskId, 'Completed');
            const data = await response.json();
            return data.result;
        } else {
            console.error(`[Orchestrator] Unexpected status: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.error(`[Orchestrator] Error during execution:`, error);
        return null;
    }
}

// --- Main Chat Loop ---
async function chatLoop() {
    console.log("\n=============================================");
    console.log("🤖 Agent Bazaar Orchestrator CLI");
    console.log("Type your request or 'exit' to quit.");
    console.log("=============================================\n");

    while (true) {
        const input = await askQuestion("You: ");

        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
            console.log("Goodbye!");
            rl.close();
            break;
        }

        if (!input.trim()) continue;

        // 1. Understand request and find agent
        const agent = await findAgent(input);

        if (!agent) {
            console.log("Orchestrator: I couldn't find an appropriate agent for your request in the registry. I currently support 'translation' and 'summarization'.\n");
            continue;
        }

        const priceAlgo = parseInt(agent.price) / 1000000;

        // 2. Ask for approval
        const approval = await askQuestion(`Orchestrator: Found [${agent.name}], costs [${priceAlgo} ALGO]. Approve payment? (yes/no): `);

        if (approval.toLowerCase() === 'yes' || approval.toLowerCase() === 'y') {
            // 3. Execute Payment & Task
            let taskId = null;
            try {
                const res = await fetch('http://localhost:5000/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ agentName: agent.name, userPrompt: input })
                });
                const data = await res.json();
                taskId = data.id;
            } catch (e) {
                console.error("Could not register task with UI:", e.message);
            }

            const result = await executeTask(agent, input, taskId);
            if (result) {
                console.log(`\nResult from ${agent.name}:\n>> ${result}\n`);
            }
        } else {
            console.log("Orchestrator: Payment cancelled.\n");
        }
    }
}

chatLoop();
