const ethers = require('ethers');
module.exports = function (RED) {
    function EthersTransferNode(config) {
        RED.nodes.createNode(this, config);
        this.mnemonic = this.credentials.mnemonic;
        this.chainId = config.chainId;
        this.rpc = config.rpc;

        var node = this;
        node.on('input', function (msg) {
            this.hierarchicalDeterministicWalletIndex = msg[config.hierarchicalDeterministicWalletIndex];
            this.toAddress = msg[config.toAddress];
            this.amount = msg[config.amount];
            const path = `m/44'/60'/0'/0/${this.hierarchicalDeterministicWalletIndex}`
            let provider = new ethers.providers.JsonRpcProvider(this.rpc);
            const wallet = ethers.Wallet.fromMnemonic(this.mnemonic,path).connect(provider);
            wallet.sendTransaction({
                to: this.toAddress,
                from: wallet.address,
                value: ethers.utils.parseEther(this.amount)
            }).then(tx => {
                provider.waitForTransaction(tx.hash).then(txReceipt => node.send({...msg, txReceipt}));
            });

        });
    }

    RED.nodes.registerType("ethers-transfer", EthersTransferNode,
        {
            credentials: {
                mnemonic: {type: "text"},
            }
        });
}
