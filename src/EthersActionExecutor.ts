import {concatMap, filter, Subject} from "rxjs";
import * as ethers from "ethers";
import {EventFilter} from "ethers";


export function createMnemonicCredential(mnemonic: string, chainId: number): MnemonicCredentials {
    return {type: CredentialType.MNEMONIC, mnemonic, chainId};
}

export function createPrivateKeyCredential(privateKey: string, chainId: number): PrivateKeyCredentials {
    return {type: CredentialType.PRIVATE_KEY, privateKey, chainId};
}

export interface BaseCredentials {
    type: CredentialType,
    chainId: number,
}

export interface MnemonicCredentials extends BaseCredentials {
    mnemonic: string
}

export interface PrivateKeyCredentials extends BaseCredentials {
    privateKey: string
}


export enum CredentialType {
    MNEMONIC = "MNEMONIC",
    PRIVATE_KEY = "PRIVATE_KEY"
}

export enum ActionType {
    TRANSFER = "TRANSFER",
    DEPLOY_CONTRACT = "DEPLOY_CONTRACT",
    WRITE_CONTRACT = "WRITE_CONTRACT",
    READ_CONTRACT = "READ_CONTRACT",
    READ_CONTRACT_EVENT = "READ_CONTRACT_EVENT",
    READ_ACCOUNT = "READ_ACCOUNT",
}

export interface OutputMapping {
    context: 'msg' | 'flow' | 'global'
    key: string,
}

export interface ReadAction {
    type: ActionType.READ_CONTRACT_EVENT | ActionType.READ_CONTRACT | ActionType.READ_ACCOUNT
}

export interface ModifyAction {
    type: ActionType
    hierarchicalDeterministicWalletIndex?: number
}

export interface TransferAction extends ModifyAction {
    amount: string,
    to: string
}

export interface DeployContractAction extends ModifyAction {
    abi: any,
    constructorParameter?: any,
    bytecode: string,
}

export interface WriteContractAction extends ModifyAction {
    abi: any,
    bytecode: string,
    contractAddress: string,
    method: string,
    params?: any,
}

export interface ReadContractAction extends ReadAction {
    abi: any,
    bytecode: string,
    contractAddress: string,
    method: string,
    params?: any,
}

export interface ReadAccountAction extends ReadAction {
    accountAddress: string,
    method: string,
}


export interface ReadContractEvent extends ReadAction {
    abi: any,
    bytecode: string,
    contractAddress: string,
    contractCreationTx: string,
    event: string,
    blockFrom: number,
    blockTo: number,
    blockRange: number,
    params?: any,
}


export class EthersActionExecutor {
    private wallets: { [key: number]: ethers.ethers.Wallet } = {}
    private subjects: { [key: number]: Subject<ModifyAction> } = {}

    private provider: ethers.providers.JsonRpcProvider;
    private msg: any;

    constructor(private credentials: BaseCredentials, private rpc: string, private node: any, private output?: OutputMapping) {
        this.provider = new ethers.providers.JsonRpcProvider(rpc);
    }

    async executeRead(a: ReadAction, msg: any): Promise<any> {
        this.node.status({});
        this.setMsg(msg);
        if (a.type === ActionType.READ_CONTRACT) {
            try {
                const action = a as ReadContractAction
                const contract = new ethers.Contract(action.contractAddress, action.abi, this.provider);

                this.node.status({fill: "yellow", shape: "ring", text: "reading"});

                let method = action.method
                method = method.replace(/\s/g, '');

                const result = await contract[method](...action.params)
                this.node.status({fill: "green", shape: "ring", text: `success`});
                this.setOutput(result);
            } catch (error) {
                this.node.error(error, this.msg)
                this.node.status({fill: "red", shape: "ring", text: `failed`});
            }
        } else if (a.type === ActionType.READ_ACCOUNT) {
            try {
                const action = a as ReadAccountAction;

                if (action.method === 'balance') {
                    this.node.status({fill: "yellow", shape: "ring", text: "reading"});
                    const result = await this.provider.getBalance(action.accountAddress);
                    this.node.status({
                        fill: "green",
                        shape: "ring",
                        text: `Balance: ${ethers.utils.formatEther(result.toString())}`
                    });
                    this.setOutput(result);
                } else if (action.method === 'transactionCount') {
                    this.node.status({fill: "yellow", shape: "ring", text: "reading"});
                    const result = await this.provider.getTransactionCount(action.accountAddress);
                    this.node.status({fill: "green", shape: "ring", text: `Tx Count: ${result}`});
                    this.setOutput(result);
                }
            } catch (error) {
                this.node.error(error, this.msg)
                this.node.status({fill: "red", shape: "ring", text: `failed`});
            }
        } else if (a.type === ActionType.READ_CONTRACT_EVENT) {
            try {
                const action = a as ReadContractEvent
                const contract = new ethers.Contract(action.contractAddress, action.abi, this.provider);
                const tx = await this.provider.getTransactionReceipt(action.contractCreationTx);
                if (!tx) {
                    throw new Error(`Could not find TxReceipt for hash: ${action.contractCreationTx}`)
                }
                this.node.status({fill: "yellow", shape: "ring", text: "reading"});
                let event = action.event
                event = event.replace(/\s/g, '');

                console.log(contract.deployTransaction)

                let filter = {}
                if (event?.length) {
                    filter = await contract.filters[event]() as EventFilter //  execute function here '()' to get the filter
                }

                let currentBlockNumber = this.provider.blockNumber;
                let from = !action.blockFrom ? tx.blockNumber : action.blockFrom;
                let to = !action.blockTo ? currentBlockNumber : action.blockTo;
                let range = !action.blockRange ? 3499 : action.blockRange;
                let blocks = to - from;
                let steps = Math.ceil(blocks / range);
                console.log(`Filter from '${this.fn(from)}' to '${this.fn(to)}' range ${range} blocks: ${this.fn(blocks)} calls: '${this.fn(steps)}'`)
                let next = from;
                let events: any;
                let status: string = '';
                let count = 0;
                for (let i = 1; i <= steps; i++) {
                    if (currentBlockNumber > (next + range)) {
                        events = await contract.queryFilter(filter, next, next + range);
                    } else {
                        events = await contract.queryFilter(filter, next, next + range);
                    }
                    count += events.length;
                    status = `[${i}/${steps}] - [${this.fn(next)}/${this.fn(next + range)}] found: '${count}'`;
                    this.node.status({fill: "yellow", shape: "ring", text: status});
                    console.log(status)
                    if (events.length > 0) {
                        this.setOutput(events);
                    }
                    next += range
                }

                this.node.status({fill: "green", shape: "ring", text: status});
            } catch (error) {
                this.node.error(error, this.msg)
                this.node.status({fill: "red", shape: "ring", text: `failed`});
            }

        }
    }


    execute(action: ModifyAction, msg: any) {
        this.node.status({});
        this.setMsg(msg);
        if (this.credentials.type === CredentialType.MNEMONIC && action.hierarchicalDeterministicWalletIndex == null) {
            this.node.error(`Node use credentials of type '${CredentialType.MNEMONIC}', but the action does not provide a 'hierarchicalDeterministicWalletIndex'. Action will not be executed!`)
            return;
        }

        switch (this.credentials.type) {
            case CredentialType.MNEMONIC : {
                if (action.hierarchicalDeterministicWalletIndex != null && action.hierarchicalDeterministicWalletIndex >= 0) {
                    if (!this.wallets[action.hierarchicalDeterministicWalletIndex]) {
                        const path = `m/44'/60'/0'/0/${action.hierarchicalDeterministicWalletIndex}`
                        const wallet = ethers.Wallet.fromMnemonic((this.credentials as MnemonicCredentials).mnemonic, path).connect(this.provider);
                        this.wallets[action.hierarchicalDeterministicWalletIndex] = wallet;
                        this.subjects[action.hierarchicalDeterministicWalletIndex] = new Subject<ModifyAction>();
                        this.subscribeTransferHandler(this.subjects[action.hierarchicalDeterministicWalletIndex]);
                        this.subscribeDeployContractHandler(this.subjects[action.hierarchicalDeterministicWalletIndex])
                        this.subscribeWriteContractHandler(this.subjects[action.hierarchicalDeterministicWalletIndex])
                    }
                    this.subjects[action.hierarchicalDeterministicWalletIndex].next(action);

                } else {
                    this.node.error(`Failed to execute action of type '${action.type}'. No 'hierarchicalDeterministicWalletIndex' was set!`)
                }
            }
                break;
            case CredentialType.PRIVATE_KEY: {
                if (!this.wallets[0]) {
                    const wallet = new ethers.Wallet((this.credentials as PrivateKeyCredentials).privateKey).connect(this.provider);
                    this.wallets[0] = wallet;
                    this.subjects[0] = new Subject<ModifyAction>();
                    this.subscribeTransferHandler(this.subjects[0]);
                    this.subscribeDeployContractHandler(this.subjects[0]);
                    this.subscribeWriteContractHandler(this.subjects[0]);
                }
                this.subjects[0].next(action);
            }
        }


    }

    private subscribeDeployContractHandler(subject: Subject<ModifyAction>) {
        subject.pipe(filter(a => a != null && a.type === ActionType.DEPLOY_CONTRACT),
            concatMap(async a => {
                try {
                    let walletIndex = !a.hierarchicalDeterministicWalletIndex ? 0 : a.hierarchicalDeterministicWalletIndex;
                    const action = a as unknown as DeployContractAction;
                    const wallet = this.wallets[walletIndex];

                    const factory = new ethers.ContractFactory(action.abi, action.bytecode, wallet);

                    this.node.status({fill: "yellow", shape: "ring", text: "deploying"});

                    const contract = await factory.deploy(...action.constructorParameter);

                    const tx = contract.deployTransaction
                    this.node.log(`Deploy contract to '${contract.address}' with hash: '${tx.hash}', gasLimit '${tx.gasLimit.toString()}', gasPrice:'${tx.gasLimit.toString()}'`)

                    return contract.deployTransaction.wait().then(txReceipt => {
                        this.node.status({fill: "green", shape: "ring", text: `deployed ${contract.address}`});
                        return {txReceipt, action, contract}
                    }).catch(e => {
                        this.node.error(e, this.msg)
                        this.node.status({fill: "red", shape: "ring", text: `failed`});
                    });
                } catch (e) {
                    this.node.error(e, this.msg);
                    this.node.status({fill: "red", shape: "ring", text: `failed`});
                    return undefined;
                }
            })
        ).subscribe(result => {
            this.node.log(`Deployed contract to '${result?.contract.address}'`)
            this.setOutput(result?.txReceipt);
        })
    }

    private subscribeWriteContractHandler(subject: Subject<ModifyAction>) {

        subject.pipe(filter(a => a != null && a.type === ActionType.WRITE_CONTRACT),
            concatMap(async a => {
                try {
                    let walletIndex = !a.hierarchicalDeterministicWalletIndex ? 0 : a.hierarchicalDeterministicWalletIndex;
                    const action = a as unknown as WriteContractAction;
                    const wallet = this.wallets[walletIndex];

                    const contract = new ethers.Contract(action.contractAddress, action.abi, wallet);

                    this.node.log(`execute method '${action.method}' with params '${action.params}' on contract '${contract.address}'`)
                    this.node.status({fill: "yellow", shape: "ring", text: "writing"});
                    let method = action.method
                    method = method.replace(/\s/g, '');


                    const resp: ethers.providers.TransactionResponse = await contract[method](...action.params);

                    return resp.wait().then(txReceipt => {
                        this.node.status({fill: "green", shape: "ring", text: `success`});
                        return {txReceipt, action, contract}
                    }).catch(e => {
                        this.node.error(e, this.msg)
                        this.node.status({fill: "red", shape: "ring", text: `failed`});
                    });
                } catch (e) {
                    this.node.error(e, this.msg);
                    this.node.status({fill: "red", shape: "ring", text: `failed`});
                    return undefined;
                }
            })
        ).subscribe(result => {
            if (result) {
                this.node.log(`executed method '${result?.action.method}' with params '${result?.action.params}' on contract '${result?.contract.address} with tx: ${result?.txReceipt?.transactionHash}'`)
                this.setOutput(result?.txReceipt);
            }
        })
    }

    private subscribeTransferHandler(subject: Subject<ModifyAction>) {
        subject.pipe(filter(a => a != null && a.type === ActionType.TRANSFER),
            concatMap(async a => {
                try {
                    let walletIndex = !a.hierarchicalDeterministicWalletIndex ? 0 : a.hierarchicalDeterministicWalletIndex;
                    const action = a as unknown as TransferAction;
                    const wallet = this.wallets[walletIndex];

                    const log = `Transfer '${action.amount}' from: '${wallet.address}' to '${action.to}'`
                    this.node.log(log)
                    this.node.status({fill: "yellow", shape: "ring", text: log});
                    const tx = await wallet.sendTransaction({
                        to: action.to,
                        from: wallet.address,
                        value: ethers.utils.parseEther(action.amount)
                    })
                    return this.provider.waitForTransaction(tx.hash).then(txReceipt => {
                        return {txReceipt, action}
                    }).catch(e => {
                        this.node.error(e, this.msg)
                        this.node.status({fill: "red", shape: "ring", text: `failed`});
                    });
                } catch (e) {
                    this.node.error(e, this.msg);
                    this.node.status({fill: "red", shape: "ring", text: `failed`});
                    return undefined;
                }
            })
        ).subscribe(result => {
            if (result) {
                const log = `Transferred '${result?.action?.amount}' from: '${result?.txReceipt?.from}' to '${result?.txReceipt?.to}'`;
                this.node.log(log)
                this.node.status({fill: "green", shape: "ring", text: log});
                this.setOutput(result?.txReceipt);
            }
        });
    }

    private setOutput(result: any): void {
        if (this.output) {
            switch (this.output.context) {
                case "msg": {
                    this.msg[this.output!?.key] = result;
                    this.node.send(this.msg);
                    break;
                }
                case "flow": {
                    this.node.context().flow.set(this.output.key, result);
                    this.node.send(this.msg);
                    break;
                }
                case "global": {
                    this.node.context().global.set(this.output.key, result);
                    this.node.send(this.msg);
                    break;
                }
            }
        }
    }

    private setMsg(msg: any): void {
        this.msg = msg;
        if (!this.msg) {
            throw Error("can not execute Read. Message need to be provided")
        }
    }

    private fn(num: string | number) {
        return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
    }

    public static transferAction(amount: string, to: string, hierarchicalDeterministicWalletIndex?: number): TransferAction {
        return {
            type: ActionType.TRANSFER,
            amount,
            to,
            hierarchicalDeterministicWalletIndex
        }
    }

    public static deployContractAction(abi: any, bytecode: any, constructorParameter?: any, hierarchicalDeterministicWalletIndex?: number): DeployContractAction {
        return {
            type: ActionType.DEPLOY_CONTRACT,
            abi,
            bytecode,
            constructorParameter,
            hierarchicalDeterministicWalletIndex
        }
    }

    public static writeContractAction(abi: any, bytecode: string, contractAddress: string, method: string, params?: any, hierarchicalDeterministicWalletIndex?: number): WriteContractAction {
        return {
            type: ActionType.WRITE_CONTRACT,
            abi,
            bytecode,
            contractAddress,
            method,
            params,
            hierarchicalDeterministicWalletIndex
        }
    }

    public static readContractAction(abi: any, bytecode: string, contractAddress: string, method: string, params?: any): ReadContractAction {
        return {
            type: ActionType.READ_CONTRACT,
            abi,
            bytecode,
            contractAddress,
            method,
            params,
        }
    }

}
