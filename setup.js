const algosdk = require('algosdk');
const fs = require('fs');

function generateWallet(name) {
    const account = algosdk.generateAccount();
    const mnemonic = algosdk.secretKeyToMnemonic(account.sk);
    console.log(`\n=== ${name} Wallet ===`);
    console.log(`Address:  ${account.addr}`);
    console.log(`Mnemonic: ${mnemonic}`);
    
    // Save to a file for later use by server/client
    fs.writeFileSync(`${name.toLowerCase()}_wallet.json`, JSON.stringify({
        address: account.addr,
        mnemonic: mnemonic
    }, null, 2));
    
    return account;
}

console.log("Generating Algorand Testnet Wallets...");
generateWallet("Seller");
generateWallet("Buyer");
console.log("\nWallets generated and saved to seller_wallet.json and buyer_wallet.json");
console.log("These files are ignored in .gitignore.");
console.log("\n-> ACTION REQUIRED: Please fund both addresses using the Algorand Testnet Faucet: https://bank.testnet.algorand.network/");
