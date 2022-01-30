import * as ethers from "ethers";

// Info you need to configure your own private-test-env.ts file with this variables, because it will not be checked in
// const mnemonic = ENV_MNEMONIC
// const rpc = ENV_RPC
////


const pk = "0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const rpc = "ENV_RPC";
const chainId = 80001;

const provider = new ethers.providers.JsonRpcProvider(rpc);
const wallet = new ethers.Wallet(pk, provider);
