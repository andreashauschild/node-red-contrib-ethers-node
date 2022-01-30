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
    TRANSFER = "TRANSFER"
}


export interface BaseAction {
    type: ActionType
    hierarchicalDeterministicWalletIndex?: number,
    msg?: any
}

export interface TransferAction extends BaseAction {
    amount: string,
    to: string
}


export class EthersActionExecutor {
    private wallets: { [key: number]: ethers.ethers.Wallet } = {}
    private subjects: { [key: number]: Subject<BaseAction> } = {}

    private provider: ethers.providers.JsonRpcProvider;


    constructor(private credentials: BaseCredentials, private node: any) {
        this.provider = new ethers.providers.JsonRpcProvider(credentials.rpc);
    }

    execute(action: BaseAction) {
        if (this.credentials.type === CredentialType.MNEMONIC && action.hierarchicalDeterministicWalletIndex==null) {
            this.node.error(`Node use credentials of type '${CredentialType.MNEMONIC}', but the action does not provide a 'hierarchicalDeterministicWalletIndex'. Action will not be executed!`)
            return;
        }

        switch (this.credentials.type) {
            case CredentialType.MNEMONIC : {
                if (action.hierarchicalDeterministicWalletIndex!=null && action.hierarchicalDeterministicWalletIndex>=0) {
                    if (!this.wallets[action.hierarchicalDeterministicWalletIndex]) {
                        const path = `m/44'/60'/0'/0/${action.hierarchicalDeterministicWalletIndex}`
                        const wallet = ethers.Wallet.fromMnemonic((this.credentials as MnemonicCredentials).mnemonic, path).connect(this.provider);
                        this.wallets[action.hierarchicalDeterministicWalletIndex] = wallet;
                        this.subjects[action.hierarchicalDeterministicWalletIndex] = new Subject<BaseAction>();
                        this.subscribeTransferHandler(this.subjects[action.hierarchicalDeterministicWalletIndex]);
                    }
                    switch (action.type) {
                        case ActionType.TRANSFER:
                            this.subjects[action.hierarchicalDeterministicWalletIndex].next(action);
                    }
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
                }
                switch (action.type) {
                    case ActionType.TRANSFER:
                        this.subjects[0].next(action);
                }
            }
        }


    }

    private subscribeTransferHandler(subject: Subject<BaseAction>) {
        subject.pipe(filter(a => a != null && a.type === ActionType.TRANSFER),
            concatMap(async a => {
                let walletIndex = !a.hierarchicalDeterministicWalletIndex ? 0 : a.hierarchicalDeterministicWalletIndex;
                const action = a as unknown as TransferAction;
                const wallet = this.wallets[walletIndex];
                this.node.log(`Transfer '${action.amount}' from: '${wallet.address}' to '${action.to}'`)
                const tx = await wallet.sendTransaction({
                    to: action.to,
                    from: wallet.address,
                    value: ethers.utils.parseEther(action.amount)
                })
                return this.provider.waitForTransaction(tx.hash).then(txReceipt => {
                    return {txReceipt, action}
                }).catch(e => this.node.error(e, action.msg));
            })
        ).subscribe(async result => {
            this.node.log(`Transferred '${result.action.amount}' from: '${result.txReceipt.from}' to '${result.txReceipt.to}'`)
            this.node.send({...result.action.msg, txReceipt: result.txReceipt})
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

}
