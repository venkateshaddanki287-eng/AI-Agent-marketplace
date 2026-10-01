const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'node_modules', '@x402-avm', 'avm', 'dist', 'cjs', 'exact', 'client', 'index.js');

if (fs.existsSync(targetFile)) {
    let content = fs.readFileSync(targetFile, 'utf8');
    
    // The original content in x402-avm 1.0.0
    const targetContent = `const assetTransferTxn = new import_transact2.Transaction({
      type: import_transact2.TransactionType.AssetTransfer,
      sender: import_common3.Address.fromString(this.signer.address),
      fee: assetTransferFee,
      firstValid: suggestedParams.firstValid,
      lastValid: suggestedParams.lastValid,
      genesisHash: suggestedParams.genesisHash,
      genesisId: suggestedParams.genesisId,
      note: new Uint8Array(Buffer.from(\`x402-payment-v\${x402Version}-\${Date.now()}\`)),
      assetTransfer: {
        receiver: import_common3.Address.fromString(payTo),
        amount: BigInt(amount),
        assetId: BigInt(assetId)
      }
    });`;

    const replacementContent = `const isAlgo = BigInt(assetId) === 0n;
    const paymentFee = BigInt(1000);
    const assetTransferTxn = new import_transact2.Transaction(isAlgo ? {
      type: import_transact2.TransactionType.Payment,
      sender: import_common3.Address.fromString(this.signer.address),
      fee: paymentFee,
      firstValid: suggestedParams.firstValid,
      lastValid: suggestedParams.lastValid,
      genesisHash: suggestedParams.genesisHash,
      genesisId: suggestedParams.genesisId,
      note: new Uint8Array(Buffer.from(\`x402-payment-v\${x402Version}-\${Date.now()}\`)),
      payment: {
        receiver: import_common3.Address.fromString(payTo),
        amount: BigInt(amount)
      }
    } : {
      type: import_transact2.TransactionType.AssetTransfer,
      sender: import_common3.Address.fromString(this.signer.address),
      fee: paymentFee,
      firstValid: suggestedParams.firstValid,
      lastValid: suggestedParams.lastValid,
      genesisHash: suggestedParams.genesisHash,
      genesisId: suggestedParams.genesisId,
      note: new Uint8Array(Buffer.from(\`x402-payment-v\${x402Version}-\${Date.now()}\`)),
      assetTransfer: {
        receiver: import_common3.Address.fromString(payTo),
        amount: BigInt(amount),
        assetId: BigInt(assetId)
      }
    });`;

    if (!content.includes('const isAlgo = BigInt(assetId) === 0n;')) {
        content = content.replace(targetContent, replacementContent);
        fs.writeFileSync(targetFile, content, 'utf8');
        console.log('Successfully patched @x402-avm client for native ALGO support.');
    } else {
        console.log('@x402-avm client already patched.');
    }
} else {
    console.warn('Could not find @x402-avm to patch. Run npm install first.');
}
