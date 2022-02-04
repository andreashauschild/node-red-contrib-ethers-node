const {
    EthersActionExecutor,
    createMnemonicCredential,
    createPrivateKeyCredential,
    CredentialType
} = require("../dist/src/EthersActionExecutor");

module.exports = function (RED) {
    function EthersTransferNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.ethCredentials = RED.nodes.getNode(config.ethCredentials);
        this.rpc = RED.nodes.getNode(this.ethCredentials.rpc).rpc;
        this.output = config.output;
        this.outputType = config.outputType;
        var cred;
        if (this.ethCredentials.privatekey) {
            cred = createPrivateKeyCredential(this.ethCredentials.privatekey, this.ethCredentials.chainId, this.ethCredentials.rpc);
        } else if (this.ethCredentials.mnemonic) {
            cred = createMnemonicCredential(this.ethCredentials.mnemonic, this.ethCredentials.chainId, this.ethCredentials.rpc);
        } else {
            node.error(`Credentials are not correct!`)
        }

        var ethersActionExecutor = new EthersActionExecutor(cred,this.rpc, node,{
            context: this.outputType,
            key: this.output
        });
        node.on('input', function (msg) {
            const toAddress = RED.util.evaluateNodeProperty(config.toAddress, config.toAddressType || "str", node, msg)
            const amount = RED.util.evaluateNodeProperty(config.amount, config.amountType || "str", node, msg)
            const hierarchicalDeterministicWalletIndex = RED.util.evaluateNodeProperty(config.hierarchicalDeterministicWalletIndex, config.hierarchicalDeterministicWalletIndexType || "num", node, msg)

            if (cred.type === CredentialType.MNEMONIC) {
                ethersActionExecutor.execute(EthersActionExecutor.transferAction(amount, toAddress, hierarchicalDeterministicWalletIndex));
            } else if (cred.type === CredentialType.PRIVATE_KEY) {
                ethersActionExecutor.execute(EthersActionExecutor.transferAction(amount, toAddress));
            }
        });
    }

    RED.nodes.registerType("ethers-transfer", EthersTransferNode);
}
