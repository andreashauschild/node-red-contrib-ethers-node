const {
    EthersActionExecutor,
    createMnemonicCredential,
    createPrivateKeyCredential,
    CredentialType
} = require("../dist/EthersActionExecutor");
module.exports = function (RED) {
    function EthersDeployNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.contract = RED.nodes.getNode(config.contract);
        this.ethCredentials = RED.nodes.getNode(config.ethCredentials);
        this.rpc = RED.nodes.getNode(this.ethCredentials.rpc).rpc;
        this.output = config.output;
        this.outputType = config.outputType;

        var cred;
        if (this.ethCredentials.privatekey) {
            cred = createPrivateKeyCredential(this.ethCredentials.privatekey, this.ethCredentials.chainId);
        } else if (this.ethCredentials.mnemonic) {
            cred = createMnemonicCredential(this.ethCredentials.mnemonic, this.ethCredentials.chainId);
        } else {
            node.error(`Credentials are not correct!`)
        }

        var ethersActionExecutor = new EthersActionExecutor(cred, this.rpc, node, {
            context: this.outputType,
            key: this.output
        });

        node.on('input', function (msg) {
            const params = RED.util.evaluateNodeProperty(config.params, config.paramsType || "json", node, msg)
            const abi = this.contract.abi;
            const bytecode = this.contract.bytecode;
            const hierarchicalDeterministicWalletIndex = RED.util.evaluateNodeProperty(config.hierarchicalDeterministicWalletIndex, config.hierarchicalDeterministicWalletIndexType || "num", node, msg)


            if (cred.type === CredentialType.MNEMONIC) {
                const action = EthersActionExecutor.deployContractAction(abi, bytecode, params, hierarchicalDeterministicWalletIndex);
                action.callback = (result) => console.log(result)
                ethersActionExecutor.execute(action);
            } else if (cred.type === CredentialType.PRIVATE_KEY) {
                ethersActionExecutor.execute(EthersActionExecutor.deployContractAction(abi, bytecode, params),msg);
            }
        });
    }

    RED.nodes.registerType("ethers-deploy", EthersDeployNode);
}
