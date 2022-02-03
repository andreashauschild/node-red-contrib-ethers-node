module.exports = function (RED) {
    function EthersRpcNode(config) {
        RED.nodes.createNode(this, config);
        this.rpc = config.rpc;
    }

    RED.nodes.registerType("ethers-rpc", EthersRpcNode);
}
