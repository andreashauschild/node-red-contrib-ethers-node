"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthersActionExecutor = exports.ActionType = exports.CredentialType = exports.createPrivateKeyCredential = exports.createMnemonicCredential = void 0;
const rxjs_1 = require("rxjs");
const ethers = __importStar(require("ethers"));
function createMnemonicCredential(mnemonic, chainId) {
    return { type: CredentialType.MNEMONIC, mnemonic, chainId };
}
exports.createMnemonicCredential = createMnemonicCredential;
function createPrivateKeyCredential(privateKey, chainId) {
    return { type: CredentialType.PRIVATE_KEY, privateKey, chainId };
}
exports.createPrivateKeyCredential = createPrivateKeyCredential;
var CredentialType;
(function (CredentialType) {
    CredentialType["MNEMONIC"] = "MNEMONIC";
    CredentialType["PRIVATE_KEY"] = "PRIVATE_KEY";
})(CredentialType = exports.CredentialType || (exports.CredentialType = {}));
var ActionType;
(function (ActionType) {
    ActionType["TRANSFER"] = "TRANSFER";
    ActionType["DEPLOY_CONTRACT"] = "DEPLOY_CONTRACT";
    ActionType["WRITE_CONTRACT"] = "WRITE_CONTRACT";
    ActionType["READ_CONTRACT"] = "READ_CONTRACT";
    ActionType["READ_CONTRACT_EVENT"] = "READ_CONTRACT_EVENT";
    ActionType["READ_ACCOUNT"] = "READ_ACCOUNT";
})(ActionType = exports.ActionType || (exports.ActionType = {}));
class EthersActionExecutor {
    constructor(credentials, rpc, node, output) {
        this.credentials = credentials;
        this.rpc = rpc;
        this.node = node;
        this.output = output;
        this.wallets = {};
        this.subjects = {};
        this.provider = new ethers.providers.JsonRpcProvider(rpc);
    }
    async executeRead(a, msg) {
        this.node.status({});
        if (a.type === ActionType.READ_CONTRACT) {
            try {
                const action = a;
                const contract = new ethers.Contract(action.contractAddress, action.abi, this.provider);
                this.node.status({ fill: "yellow", shape: "ring", text: "reading" });
                let method = action.method;
                method = method.replace(/\s/g, '');
                const result = await contract[method](...action.params);
                this.node.status({ fill: "green", shape: "ring", text: `success` });
                this.setOutput(result, msg);
            }
            catch (error) {
                this.node.error(error, msg);
                this.node.status({ fill: "red", shape: "ring", text: `failed` });
            }
        }
        else if (a.type === ActionType.READ_ACCOUNT) {
            try {
                const action = a;
                if (action.method === 'balance') {
                    this.node.status({ fill: "yellow", shape: "ring", text: "reading" });
                    const result = await this.provider.getBalance(action.accountAddress);
                    this.node.status({
                        fill: "green",
                        shape: "ring",
                        text: `Balance: ${ethers.utils.formatEther(result.toString())}`
                    });
                    this.setOutput(result, msg);
                }
                else if (action.method === 'transactionCount') {
                    this.node.status({ fill: "yellow", shape: "ring", text: "reading" });
                    const result = await this.provider.getTransactionCount(action.accountAddress);
                    this.node.status({ fill: "green", shape: "ring", text: `Tx Count: ${result}` });
                    this.setOutput(result, msg);
                }
            }
            catch (error) {
                this.node.error(error, msg);
                this.node.status({ fill: "red", shape: "ring", text: `failed` });
            }
        }
        else if (a.type === ActionType.READ_CONTRACT_EVENT) {
            try {
                const action = a;
                const contract = new ethers.Contract(action.contractAddress, action.abi, this.provider);
                let tx;
                if (action.contractCreationTx) {
                    tx = await this.provider.getTransactionReceipt(action.contractCreationTx);
                    if (!tx) {
                        throw new Error(`Could not find TxReceipt for hash: ${action.contractCreationTx}`);
                    }
                }
                this.node.status({ fill: "yellow", shape: "ring", text: "reading" });
                let event = action.event;
                event = event.replace(/\s/g, '');
                console.log(contract.deployTransaction);
                let filter = {};
                if (event === null || event === void 0 ? void 0 : event.length) {
                    filter = await contract.filters[event](); //  execute function here '()' to get the filter
                }
                let from = this.provider.blockNumber;
                let currentBlockNumber = this.provider.blockNumber;
                if (action.blockFrom) {
                    from = action.blockFrom;
                }
                else if (tx === null || tx === void 0 ? void 0 : tx.blockNumber) {
                    from = tx.blockNumber;
                }
                let to = !action.blockTo ? currentBlockNumber : action.blockTo;
                let range = !action.blockRange ? 3499 : action.blockRange;
                let blocks = to - from;
                let steps = Math.ceil(blocks / range);
                console.log(`Filter from '${this.fn(from)}' to '${this.fn(to)}' range ${range} blocks: ${this.fn(blocks)} calls: '${this.fn(steps)}'`);
                let next = from;
                let events;
                let status = '';
                let count = 0;
                for (let i = 1; i <= steps; i++) {
                    if (currentBlockNumber > (next + range)) {
                        events = await contract.queryFilter(filter, next, next + range);
                    }
                    else {
                        events = await contract.queryFilter(filter, next, next + range);
                    }
                    count += events.length;
                    status = `[${i}/${steps}] - [${this.fn(next)}/${this.fn(next + range)}] found: '${count}'`;
                    this.node.status({ fill: "yellow", shape: "ring", text: status });
                    console.log(status);
                    if (events.length > 0) {
                        this.setOutput(events, msg);
                    }
                    next += range;
                }
                this.node.status({ fill: "green", shape: "ring", text: status });
            }
            catch (error) {
                this.node.error(error, msg);
                this.node.status({ fill: "red", shape: "ring", text: `failed` });
            }
        }
    }
    execute(action, msg) {
        this.node.status({});
        if (this.credentials.type === CredentialType.MNEMONIC && action.hierarchicalDeterministicWalletIndex == null) {
            this.node.error(`Node use credentials of type '${CredentialType.MNEMONIC}', but the action does not provide a 'hierarchicalDeterministicWalletIndex'. Action will not be executed!`);
            return;
        }
        switch (this.credentials.type) {
            case CredentialType.MNEMONIC:
                {
                    if (action.hierarchicalDeterministicWalletIndex != null && action.hierarchicalDeterministicWalletIndex >= 0) {
                        if (!this.wallets[action.hierarchicalDeterministicWalletIndex]) {
                            const path = `m/44'/60'/0'/0/${action.hierarchicalDeterministicWalletIndex}`;
                            const wallet = ethers.Wallet.fromMnemonic(this.credentials.mnemonic, path).connect(this.provider);
                            this.wallets[action.hierarchicalDeterministicWalletIndex] = wallet;
                            this.subjects[action.hierarchicalDeterministicWalletIndex] = new rxjs_1.Subject();
                            this.subscribeTransferHandler(this.subjects[action.hierarchicalDeterministicWalletIndex], msg);
                            this.subscribeDeployContractHandler(this.subjects[action.hierarchicalDeterministicWalletIndex], msg);
                            this.subscribeWriteContractHandler(this.subjects[action.hierarchicalDeterministicWalletIndex], msg);
                        }
                        this.subjects[action.hierarchicalDeterministicWalletIndex].next(action);
                    }
                    else {
                        this.node.error(`Failed to execute action of type '${action.type}'. No 'hierarchicalDeterministicWalletIndex' was set!`);
                    }
                }
                break;
            case CredentialType.PRIVATE_KEY: {
                if (!this.wallets[0]) {
                    const wallet = new ethers.Wallet(this.credentials.privateKey).connect(this.provider);
                    this.wallets[0] = wallet;
                    this.subjects[0] = new rxjs_1.Subject();
                    this.subscribeTransferHandler(this.subjects[0], msg);
                    this.subscribeDeployContractHandler(this.subjects[0], msg);
                    this.subscribeWriteContractHandler(this.subjects[0], msg);
                }
                this.subjects[0].next(action);
            }
        }
    }
    subscribeDeployContractHandler(subject, msg) {
        subject.pipe((0, rxjs_1.filter)(a => a != null && a.type === ActionType.DEPLOY_CONTRACT), (0, rxjs_1.concatMap)(async (a) => {
            try {
                let walletIndex = !a.hierarchicalDeterministicWalletIndex ? 0 : a.hierarchicalDeterministicWalletIndex;
                const action = a;
                const wallet = this.wallets[walletIndex];
                const factory = new ethers.ContractFactory(action.abi, action.bytecode, wallet);
                this.node.status({ fill: "yellow", shape: "ring", text: "deploying" });
                const contract = await factory.deploy(...action.constructorParameter);
                const tx = contract.deployTransaction;
                this.node.log(`Deploy contract to '${contract.address}' with hash: '${tx.hash}', gasLimit '${tx.gasLimit.toString()}', gasPrice:'${tx.gasLimit.toString()}'`);
                return contract.deployTransaction.wait().then(txReceipt => {
                    this.node.status({ fill: "green", shape: "ring", text: `deployed ${contract.address}` });
                    return { txReceipt, action, contract };
                }).catch(e => {
                    this.node.error(e, msg);
                    this.node.status({ fill: "red", shape: "ring", text: `failed` });
                });
            }
            catch (e) {
                this.node.error(e, msg);
                this.node.status({ fill: "red", shape: "ring", text: `failed` });
                return undefined;
            }
        })).subscribe(result => {
            var _a;
            this.node.log(`Deployed contract to '${(_a = result === null || result === void 0 ? void 0 : result.contract) === null || _a === void 0 ? void 0 : _a.address}'`);
            this.setOutput(result === null || result === void 0 ? void 0 : result.txReceipt, msg);
        });
    }
    subscribeWriteContractHandler(subject, msg) {
        subject.pipe((0, rxjs_1.filter)(a => a != null && a.type === ActionType.WRITE_CONTRACT), (0, rxjs_1.concatMap)(async (a) => {
            try {
                let walletIndex = !a.hierarchicalDeterministicWalletIndex ? 0 : a.hierarchicalDeterministicWalletIndex;
                const action = a;
                const wallet = this.wallets[walletIndex];
                const contract = new ethers.Contract(action.contractAddress, action.abi, wallet);
                this.node.log(`execute method '${action.method}' with params '${action.params}' on contract '${contract.address}'`);
                this.node.status({ fill: "yellow", shape: "ring", text: "writing" });
                let method = action.method;
                method = method.replace(/\s/g, '');
                let resp;
                if (action.payment) {
                    resp = await contract[method](...action.params, { value: ethers.utils.parseEther(action.payment) });
                }
                else {
                    resp = await contract[method](...action.params);
                }
                return resp.wait().then(txReceipt => {
                    this.node.status({ fill: "green", shape: "ring", text: `success` });
                    return { txReceipt, action, contract };
                }).catch(e => {
                    this.node.error(e, msg);
                    this.node.status({ fill: "red", shape: "ring", text: `failed` });
                });
            }
            catch (e) {
                this.node.error(e, msg);
                this.node.status({ fill: "red", shape: "ring", text: `failed` });
                return undefined;
            }
        })).subscribe(result => {
            var _a;
            if (result) {
                this.node.log(`executed method '${result === null || result === void 0 ? void 0 : result.action.method}' with params '${result === null || result === void 0 ? void 0 : result.action.params}' on contract '${result === null || result === void 0 ? void 0 : result.contract.address} with tx: ${(_a = result === null || result === void 0 ? void 0 : result.txReceipt) === null || _a === void 0 ? void 0 : _a.transactionHash}'`);
                this.setOutput(result === null || result === void 0 ? void 0 : result.txReceipt, msg);
            }
        });
    }
    subscribeTransferHandler(subject, msg) {
        subject.pipe((0, rxjs_1.filter)(a => a != null && a.type === ActionType.TRANSFER), (0, rxjs_1.concatMap)(async (a) => {
            try {
                let walletIndex = !a.hierarchicalDeterministicWalletIndex ? 0 : a.hierarchicalDeterministicWalletIndex;
                const action = a;
                const wallet = this.wallets[walletIndex];
                const log = `Transfer '${action.amount}' from: '${wallet.address}' to '${action.to}'`;
                this.node.log(log);
                this.node.status({ fill: "yellow", shape: "ring", text: log });
                const tx = await wallet.sendTransaction({
                    to: action.to,
                    from: wallet.address,
                    value: ethers.utils.parseEther(action.amount)
                });
                return this.provider.waitForTransaction(tx.hash).then(txReceipt => {
                    return { txReceipt, action };
                }).catch(e => {
                    this.node.error(e, msg);
                    this.node.status({ fill: "red", shape: "ring", text: `failed` });
                });
            }
            catch (e) {
                this.node.error(e, msg);
                this.node.status({ fill: "red", shape: "ring", text: `failed` });
                return undefined;
            }
        })).subscribe(result => {
            var _a, _b, _c;
            if (result) {
                const log = `Transferred '${(_a = result === null || result === void 0 ? void 0 : result.action) === null || _a === void 0 ? void 0 : _a.amount}' from: '${(_b = result === null || result === void 0 ? void 0 : result.txReceipt) === null || _b === void 0 ? void 0 : _b.from}' to '${(_c = result === null || result === void 0 ? void 0 : result.txReceipt) === null || _c === void 0 ? void 0 : _c.to}'`;
                this.node.log(log);
                this.node.status({ fill: "green", shape: "ring", text: log });
                this.setOutput(result === null || result === void 0 ? void 0 : result.txReceipt, msg);
            }
        });
    }
    setOutput(result, msg) {
        var _a;
        if (this.output) {
            switch (this.output.context) {
                case "msg": {
                    msg[(_a = this.output) === null || _a === void 0 ? void 0 : _a.key] = result;
                    this.node.send(msg);
                    break;
                }
                case "flow": {
                    this.node.context().flow.set(this.output.key, result);
                    this.node.send(msg);
                    break;
                }
                case "global": {
                    this.node.context().global.set(this.output.key, result);
                    this.node.send(msg);
                    break;
                }
            }
        }
    }
    fn(num) {
        return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    }
    static transferAction(amount, to, hierarchicalDeterministicWalletIndex) {
        return {
            type: ActionType.TRANSFER,
            amount,
            to,
            hierarchicalDeterministicWalletIndex
        };
    }
    static deployContractAction(abi, bytecode, constructorParameter, hierarchicalDeterministicWalletIndex) {
        return {
            type: ActionType.DEPLOY_CONTRACT,
            abi,
            bytecode,
            constructorParameter,
            hierarchicalDeterministicWalletIndex
        };
    }
    static writeContractAction(abi, bytecode, contractAddress, method, payment, params, hierarchicalDeterministicWalletIndex) {
        return {
            type: ActionType.WRITE_CONTRACT,
            abi,
            bytecode,
            contractAddress,
            method,
            payment,
            params,
            hierarchicalDeterministicWalletIndex
        };
    }
    static readContractAction(abi, bytecode, contractAddress, method, params) {
        return {
            type: ActionType.READ_CONTRACT,
            abi,
            bytecode,
            contractAddress,
            method,
            params,
        };
    }
}
exports.EthersActionExecutor = EthersActionExecutor;
//# sourceMappingURL=EthersActionExecutor.js.map