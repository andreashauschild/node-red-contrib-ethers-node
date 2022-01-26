const {EthersActionExecutor} = require("../dist/src/EthersActionExecutor");
const {TransferAction} = require("../dist/src/EthersActionExecutor");

module.exports = function (RED) {
    function EthersTransferNode(config) {
        RED.nodes.createNode(this, config);
        this.mnemonic = this.credentials.mnemonic;
        this.chainId = config.chainId;
        this.rpc = config.rpc;
        var node = this;
        var ethersActionExecutor = new EthersActionExecutor(this.mnemonic, this.chainId, this.rpc, node);
        node.on('input', function (msg) {
            this.hierarchicalDeterministicWalletIndex = msg[config.hierarchicalDeterministicWalletIndex];
            this.toAddress = msg[config.toAddress];
            this.amount = msg[config.amount];
            ethersActionExecutor.execute(new TransferAction(this.hierarchicalDeterministicWalletIndex, this.toAddress, this.amount));
        });
    }

    RED.nodes.registerType("ethers-transfer", EthersTransferNode,
        {
            credentials: {
                mnemonic: {type: "text"},
            }
        });
}
