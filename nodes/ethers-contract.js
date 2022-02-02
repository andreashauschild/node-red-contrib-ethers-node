module.exports = function (RED) {
    function EthersContractNode(config) {
        RED.nodes.createNode(this, config);
        this.abi = config.abi;
        this.bytecode = config.bytecode;
    }

    RED.nodes.registerType("ethers-contract", EthersContractNode);
}
