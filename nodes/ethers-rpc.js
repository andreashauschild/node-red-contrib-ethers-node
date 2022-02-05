const {
    ethers
} = require("ethers");
module.exports = function (RED) {
    function EthersRpcNode(config) {
        RED.nodes.createNode(this, config);
        this.rpc = config.rpc;
    }

    RED.nodes.registerType("ethers-rpc", EthersRpcNode);
}
