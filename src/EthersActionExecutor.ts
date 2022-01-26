import {concatMap, filter, Subject} from "rxjs";
import * as ethers from "ethers";

export enum ActionType {
    TRANSFER = "TRANSFER"
}

export abstract class BaseAction {
    protected constructor(public type: string, public hierarchicalDeterministicWalletIndex: number, public msg?: any) {
    }
}

export class TransferAction extends BaseAction {
    constructor(public hierarchicalDeterministicWalletIndex: number, public to: string, public amount: string, public msg?: any) {
        super(ActionType.TRANSFER, hierarchicalDeterministicWalletIndex, msg)
    }
}


export class EthersActionExecutor {
    private wallets: { [key: number]: ethers.ethers.Wallet } = {}
    private subjects: { [key: number]: Subject<BaseAction> } = {}

    private provider: ethers.providers.JsonRpcProvider;

    constructor(private mnemonic: string, private chainId: number, private rpc: string, private node: any) {
        this.provider = new ethers.providers.JsonRpcProvider(this.rpc);
    }

    execute(action: BaseAction) {
        if (!this.wallets[action.hierarchicalDeterministicWalletIndex]) {
            const path = `m/44'/60'/0'/0/${action.hierarchicalDeterministicWalletIndex}`
            const wallet = ethers.Wallet.fromMnemonic(this.mnemonic, path).connect(this.provider);
            this.wallets[action.hierarchicalDeterministicWalletIndex] = wallet;
            this.subjects[action.hierarchicalDeterministicWalletIndex] = new Subject<BaseAction>();
            this.subscribeTransferHandler(this.subjects[action.hierarchicalDeterministicWalletIndex]);
        }
        switch (action.type) {
            case ActionType.TRANSFER:
                this.subjects[action.hierarchicalDeterministicWalletIndex].next(action);
        }
    }

    private subscribeTransferHandler(subject: Subject<BaseAction>) {
        subject.pipe(filter(a => a != null && a.type === ActionType.TRANSFER),
            concatMap(async a => {
                const action = a as unknown as TransferAction;
                const wallet = this.wallets[action.hierarchicalDeterministicWalletIndex];
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

}
