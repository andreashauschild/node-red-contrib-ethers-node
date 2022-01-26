# node-red-contrib-ethers-node
Node-Red Nodes for wrapping ethers functions.

Transfer Node to send basic funds. 


![system schema](https://github.com/andreashauschild/node-red-contrib-ethers-node/blob/main/docs/screenshot.PNG?raw=true)

# Developer notes.

`cd C:\Users\hausc\.node-red`
`npm install C:\Work\Entwicklung\Git\node-red-contrib-ethers-node`

# Install 
`npm install -g ts-node` to execute local scripts `ts-node .\src\test.ts`
`node-red-contrib-ethers-node> tsc -w`
 Typescript imports have to be like `import * as ethers from "ethers";` if you get undefined - https://github.com/TypeStrong/ts-node/issues/311
`npm publish --access public`
