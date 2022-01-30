module.exports = function (RED) {
    function EthersCredentialsNode(config) {
        RED.nodes.createNode(this, config);
        this.mnemonic = this.credentials.mnemonic;
        this.privatekey = this.credentials.privatekey;
        this.chainId = config.chainId;
        this.rpc = config.rpc;
    }

    RED.nodes.registerType("ethers-credentials", EthersCredentialsNode,
        {
            credentials: {
                mnemonic: {type: "text"},
                privatekey: {type: "text"},
            }
        });
}
