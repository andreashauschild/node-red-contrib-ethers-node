const {
    EthersActionExecutor,
    createMnemonicCredential,
    createPrivateKeyCredential,
    CredentialType
} = require("../dist/src/EthersActionExecutor");
module.exports = function (RED) {
    function EthersWriteContractNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        this.contract = RED.nodes.getNode(config.contract);
        this.ethCredentials = RED.nodes.getNode(config.ethCredentials);
        this.output = config.output;
        this.outputType = config.outputType;

        this.rpc = RED.nodes.getNode(this.ethCredentials.rpc).rpc;



        var cred;
        if (this.ethCredentials.privatekey) {
            cred = createPrivateKeyCredential(this.ethCredentials.privatekey, this.ethCredentials.chainId);
        } else if (this.ethCredentials.mnemonic) {
            cred = createMnemonicCredential(this.ethCredentials.mnemonic, this.ethCredentials.chainId);
        } else {
            node.error(`Credentials are not correct!`)
        }

        var ethersActionExecutor = new EthersActionExecutor(cred, this.rpc,node,{
            context: this.outputType,
            key: this.output
        });

        node.on('input', function (msg) {
            console.log("PAYMENT",config.payment)
            const params = RED.util.evaluateNodeProperty(config.params, config.paramsType || "json", node, msg)

            const payment = RED.util.evaluateNodeProperty(config.payment, config.paymentType || "str", node, msg)
            console.log("PAYMENT",config.payment)
            const abi = this.contract.abi;
            const bytecode = this.contract.bytecode;
            const contractAddress = RED.util.evaluateNodeProperty(config.contractAddress, config.contractAddressType || "str", node, msg)
            const method = config.method
            const hierarchicalDeterministicWalletIndex = RED.util.evaluateNodeProperty(config.hierarchicalDeterministicWalletIndex, config.hierarchicalDeterministicWalletIndexType || "num", node, msg)


            if (cred.type === CredentialType.MNEMONIC) {
                const action = EthersActionExecutor.writeContractAction(abi, bytecode,contractAddress,method, payment,params, hierarchicalDeterministicWalletIndex);
                ethersActionExecutor.execute(action,msg);
            } else if (cred.type === CredentialType.PRIVATE_KEY) {
                ethersActionExecutor.execute(EthersActionExecutor.writeContractAction(abi, bytecode,contractAddress,method, payment,params),msg);
            }
        });
    }

    RED.nodes.registerType("ethers-write-contract", EthersWriteContractNode);
}
