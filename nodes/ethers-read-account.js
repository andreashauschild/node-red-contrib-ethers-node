const {
    ReadAccountAction,
    ActionType,
    EthersActionExecutor
} = require("./lib/EthersActionExecutor");
module.exports = function (RED) {
    function EthersAccountReadNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.rpc = RED.nodes.getNode(config.rpc).rpc;
        this.output = config.output;
        this.outputType = config.outputType;
        var ethersActionExecutor = new EthersActionExecutor(null, this.rpc, node, {
            context: this.outputType,
            key: this.output
        });
        node.on('input', function (msg) {
            const accountAddress = RED.util.evaluateNodeProperty(config.accountAddress, config.accountAddressType || "str", node, msg)
            const method = config.method
            const action = {
                type:ActionType.READ_ACCOUNT,
                accountAddress,
                method
            }
            ethersActionExecutor.executeRead(action,msg);
        });
    }

    RED.nodes.registerType("ethers-read-account", EthersAccountReadNode);
}
