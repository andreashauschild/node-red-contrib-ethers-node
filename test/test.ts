import {createMnemonicCredential, EthersActionExecutor} from "../src/EthersActionExecutor";
// import {ENV_MNEMONIC, ENV_RPC} from "./private-test-env";

// Info you need to configure your own private-test-env.ts file with this variables, because it will not be checked in
// const mnemonic = ENV_MNEMONIC
// const rpc = ENV_RPC
////


const mnemonic = "ENV_MNEMONIC"
const rpc = "ENV_RPC"
const chainId = 80001;


const delay = (ms: number, error?: boolean) => new Promise(resolve => {
    setTimeout(resolve, ms);
    if (error) {
        throw new Error("Whoops!");
    }
})

const node = {
    warn: (value: any) => console.warn("WARN:", value),
    error: (value: any, msg: any) => console.error("ERROR:", value, msg),
    send: (msg: any) => console.info("SEND:", msg),
    log: (msg: any) => console.log(msg),
}

const nodeSilent = {
    warn: (value: any) => console.log(),
    error: (value: any, msg: any) => console.error("ERROR:", value, msg),
    send: (msg: any) => console.log(),
    log: (msg: any) => console.log(msg),
}
const mnemonicCredentials = createMnemonicCredential(mnemonic, chainId, rpc);
let ethersActionExecutor = new EthersActionExecutor(mnemonicCredentials, nodeSilent);

for (var i = 0; i < 10; i++) {
    ethersActionExecutor.execute(EthersActionExecutor.transferAction("0.01", "0xB3474e5f6186bFf89604bbf44630b2b49A8272aB", i));

}

