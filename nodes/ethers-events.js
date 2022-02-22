const {
    EthersActionExecutor, ActionType
} = require("../dist/EthersActionExecutor");
module.exports = function (RED) {
    function EthersEventsNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        this.contract = RED.nodes.getNode(config.contract);
        this.rpc = RED.nodes.getNode(config.rpc).rpc;
        this.output = config.output;
        this.outputType = config.outputType;
        var ethersActionExecutor = new EthersActionExecutor(null, this.rpc, node, {
            context: this.outputType,
            key: this.output
        });
        node.on('input', function (msg) {
            const params = RED.util.evaluateNodeProperty(config.params, config.paramsType || "json", node, msg)
            const abi = this.contract.abi;
            const bytecode = this.contract.bytecode;
            const contractAddress = RED.util.evaluateNodeProperty(config.contractAddress, config.contractAddressType || "str", node, msg)
            const contractCreationTx = RED.util.evaluateNodeProperty(config.contractCreationTx, config.contractCreationTxType || "str", node, msg)

            const blockFrom = RED.util.evaluateNodeProperty(config.blockFrom, config.blockFromType || "num", node, msg)
            const blockTo = RED.util.evaluateNodeProperty(config.blockTo, config.blockToType || "num", node, msg)
            const blockRange = RED.util.evaluateNodeProperty(config.blockRange, config.blockRangeType || "num", node, msg)

            const event = config.event
            ethersActionExecutor.executeRead({
                type: ActionType.READ_CONTRACT_EVENT,
                abi,
                bytecode,
                contractAddress,
                contractCreationTx,
                event,
                blockFrom,
                blockTo,
                blockRange,
                params,
            }, msg);
        });
    }

    RED.nodes.registerType("ethers-events", EthersEventsNode);
}
