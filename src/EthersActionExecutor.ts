import {concatMap, filter, Subject} from "rxjs";
import * as ethers from "ethers";


export function createMnemonicCredential(mnemonic: string, chainId: number, rpc: string): MnemonicCredentials {
    return {type: CredentialType.MNEMONIC, mnemonic, chainId, rpc};
}

export function createPrivateKeyCredential(privateKey: string, chainId: number, rpc: string): PrivateKeyCredentials {
    return {type: CredentialType.PRIVATE_KEY, privateKey, chainId, rpc};
}

export interface BaseCredentials {
    type: CredentialType,
    chainId: number,
    rpc: string
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
    WRITE_CONTRACT = "WRITE_CONTRACT"
}


export interface BaseAction {
    type: ActionType
    hierarchicalDeterministicWalletIndex?: number,
    msg?: any,
}

export interface TransferAction extends BaseAction {
    amount: string,
    to: string
}

export interface DeployContractAction extends BaseAction {
    abi: any,
    constructorParameter?: any,
    bytecode: string,
}

export interface WriteContractAction extends BaseAction {
    abi: any,
    bytecode: string,
    contractAddress: string,
    method: string,
    params?: any,
}

export class EthersActionExecutor {
    private wallets: { [key: number]: ethers.ethers.Wallet } = {}
    private subjects: { [key: number]: Subject<BaseAction> } = {}

    private provider: ethers.providers.JsonRpcProvider;


    constructor(private credentials: BaseCredentials, private node: any) {
        this.provider = new ethers.providers.JsonRpcProvider(credentials.rpc);
    }

    execute(action: BaseAction) {
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
                        this.subjects[action.hierarchicalDeterministicWalletIndex] = new Subject<BaseAction>();
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
                    this.subjects[0] = new Subject<BaseAction>();
                    this.subscribeTransferHandler(this.subjects[0]);
                    this.subscribeDeployContractHandler(this.subjects[0]);
                    this.subscribeWriteContractHandler(this.subjects[0]);
                }
                this.subjects[0].next(action);

            }
        }


    }

    private subscribeDeployContractHandler(subject: Subject<BaseAction>) {
        subject.pipe(filter(a => a != null && a.type === ActionType.DEPLOY_CONTRACT),
            concatMap(async a => {
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
                    this.node.error(e, action.msg)
                    this.node.status({fill: "red", shape: "ring", text: `failed`});
                });
            })
        ).subscribe(async result => {
            this.node.log(`Deployed contract to '${result?.contract.address}'`)
            this.node.send({...result?.action.msg, txReceipt: result?.txReceipt})
        });
    }

    private subscribeWriteContractHandler(subject: Subject<BaseAction>) {
        subject.pipe(filter(a => a != null && a.type === ActionType.WRITE_CONTRACT),
            concatMap(async a => {
                let walletIndex = !a.hierarchicalDeterministicWalletIndex ? 0 : a.hierarchicalDeterministicWalletIndex;
                const action = a as unknown as WriteContractAction;
                const wallet = this.wallets[walletIndex];

                const contract = new ethers.Contract(action.contractAddress, action.abi, wallet);

                this.node.status({fill: "yellow", shape: "ring", text: "writing"});

                let method = action.method
                method = method.replace(/\s/g, '');
                const resp: ethers.providers.TransactionResponse = await contract[method](...action.params)
                return resp.wait().then(txReceipt => {
                    this.node.status({fill: "green", shape: "ring", text: `success`});
                    return {txReceipt, action, contract}
                }).catch(e => {
                    this.node.error(e, action.msg)
                    this.node.status({fill: "red", shape: "ring", text: `failed`});
                });
            })
        ).subscribe(async result => {
            this.node.log(`Deployed contract to '${result?.contract.address}'`)
            this.node.send({...result?.action.msg, txReceipt: result?.txReceipt})
        });
    }

    private subscribeTransferHandler(subject: Subject<BaseAction>) {
        subject.pipe(filter(a => a != null && a.type === ActionType.TRANSFER),
            concatMap(async a => {
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
                    this.node.error(e, action.msg)
                    this.node.status({fill: "red", shape: "ring", text: `failed`});
                });
            })
        ).subscribe(async result => {
            const log = `Transferred '${result?.action?.amount}' from: '${result?.txReceipt?.from}' to '${result?.txReceipt?.to}'`;
            this.node.log(log)
            this.node.status({fill: "green", shape: "ring", text: log});
            this.node.send({...result?.action.msg, txReceipt: result?.txReceipt})
        });
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

}
