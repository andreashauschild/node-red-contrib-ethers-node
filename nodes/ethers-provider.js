const {ethers} = require("ethers");
module.exports = function (RED) {
    function EthersProviderNode(config) {
        RED.nodes.createNode(this, config);
        var globalContext = this.context().global;

        globalContext.set(config.ethersKey, ethers);

    }

    RED.nodes.registerType("ethers-provider", EthersProviderNode);
}
