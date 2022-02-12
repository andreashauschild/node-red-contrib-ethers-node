import {ethers} from "hardhat";
import {EnieToken, EnieToken__factory} from "../typechain-types";
import {CredentialType, EthersActionExecutor, PrivateKeyCredentials} from "../../src/EthersActionExecutor";
import waitUntil from "async-wait-until";
import {TransactionReceipt} from "@ethersproject/abstract-provider/src.ts/index";
import {expect} from "chai";

//get accounts + pk with -> npx hardhat node
const accounts: { account: string, cred: PrivateKeyCredentials }[] = [
    // Account  0
    {
        account: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        cred: {
            type: CredentialType.PRIVATE_KEY,
            privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
            chainId: 31337
        }
    },
    // Account  1
    {
        account: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
        cred: {
            type: CredentialType.PRIVATE_KEY,
            privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
            chainId: 31337
        }
    },
    // Account  2
    {
        account: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
        cred: {
            type: CredentialType.PRIVATE_KEY,
            privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
            chainId: 31337
        }
    }
]

const node = {
    warn: (value: any) => console.warn("WARN:", value),
    error: (value: any, msg: any) => console.error("ERROR:", value, msg),
    send: (msg: any) => console.info("SEND:", "msg"),
    log: (msg: any) => console.log("LOG:", msg),
    status: (state: any) => console.log("STATE:", state),
}

describe("EthersActionExecutor", function () {
    it("Deploy Smart Contract Enie Token", async function () {
        const [acc0] = await ethers.getSigners();
        const msg: any = Object.create({});
        let ethersActionExecutor = new EthersActionExecutor(accounts[0].cred, "", node, {
            context: "msg",
            key: "payload"
        });
        // @ts-ignore - hacky way to set provider because i dont know test rpc url
        ethersActionExecutor.provider = ethers.provider;
        ethersActionExecutor.execute(EthersActionExecutor.deployContractAction(EnieToken__factory.abi, EnieToken__factory.bytecode, ["Enie Token", "ENIE"]), msg)

        await waitUntil(() => msg?.payload !== undefined, {timeout: 10000},);

        const txReceipt = msg.payload as TransactionReceipt;
        console.log(txReceipt.contractAddress);
        const contract: EnieToken = new EnieToken__factory().connect(acc0).attach(txReceipt.contractAddress);

        expect((await contract.balanceOf(accounts[0].account)).gt(0)).to.be.true;


    });

    it("Call contract write on payable function", async function () {
        const [acc0, acc1] = await ethers.getSigners();
        const contract = await new EnieToken__factory().connect(acc0).deploy("Enie Token", "ENIE");
        await contract.deployTransaction.wait();

        const balanceBefore = await acc1.getBalance();
        const msg: any = Object.create({});
        let ethersActionExecutor = new EthersActionExecutor(accounts[1].cred, "", node, {
            context: "msg",
            key: "payload"
        });
        // @ts-ignore - hacky way to set provider because i dont know test rpc url

        ethersActionExecutor.provider = ethers.provider;
        ethersActionExecutor.execute(EthersActionExecutor.writeContractAction(
                EnieToken__factory.abi,
                EnieToken__factory.bytecode,
                contract.address,
                "buyToken(address, uint256)",
                "1",
                [acc1.address, "1"])
            , msg)

        await waitUntil(() => msg?.payload !== undefined, {timeout: 10000},);

        const balanceAfter = await acc1.getBalance();
        const txReceipt = msg.payload as TransactionReceipt;
        const txCost = txReceipt.cumulativeGasUsed.mul(txReceipt.effectiveGasPrice);
        const payedEther = ethers.utils.parseEther("1");
        expect(balanceAfter.add(txCost).lt(balanceBefore), "Check that a payment was sent").to.be.true;
        expect(balanceAfter.add(txCost).add(payedEther).toString(), "Check that exactly 1 Ether was sent").eq(balanceBefore.toString())


    });
});
