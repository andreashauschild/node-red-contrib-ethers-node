# node-red-contrib-ethers-node
Node-Red Nodes for wrapping ethers functions. See https://docs.ethers.io/ . This project is in a very early proof of concept state. Everything can and will change. Read the code for documentation.

First stable version will be 1.0.0

**Transfer Node to send basic funds.**

| Mnemonic Based Config | Mnemonic Based Transfer Node |
|-----------------------|------------------------------|
|![system schema](https://github.com/andreashauschild/node-red-contrib-ethers-node/blob/main/docs/config-node-mnemonic.PNG?raw=true)|![system schema](https://github.com/andreashauschild/node-red-contrib-ethers-node/blob/main/docs/transfer-mnemonic.PNG?raw=true)|


| Private Key Based Config                                                                                                  | Private Key Based Transfer Node                                                                                           |
|---------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| ![system schema](https://github.com/andreashauschild/node-red-contrib-ethers-node/blob/main/docs/config-node-pkey.PNG?raw=true) | ![system schema](https://github.com/andreashauschild/node-red-contrib-ethers-node/blob/main/docs/transfer-pkey.PNG?raw=true) |

**Generic Smart Contract Deployment Node**

![system schema](https://github.com/andreashauschild/node-red-contrib-ethers-node/blob/main/docs/deploy-node.PNG?raw=true)


# Developer notes.
This project is in early development

`cd C:\Users\hausc\.node-red`
`npm install C:\Work\Entwicklung\Git\node-red-contrib-ethers-node`

## Typescript integration
I am currently not aware about any clean way of using 100% Typescript for implementing nodes. The chosen 
approach for this project is to implement the most logic in Typescript classes which will be instantiated and execute within the javascript nodes.
If somebody knows a better way, please let me know.

**Info**
Typescript imports have to be like `import * as ethers from "ethers";` if you get undefined - https://github.com/TypeStrong/ts-node/issues/311


## Testing
The testing setup is not done yet at the moment the implementation is tested with script and real blockchain interaction

- **Execute test scripts:** `npm install -g ts-node` to execute local scripts `ts-node .\src\test.ts`



## Star development workspace
To start developing run: `npm run watch`. This will:
1. Compile the typescript classes
2. Kills the local node-red server on port `1880` (if you are not running node-red on `1880` you need to change the port in the package.json)
  ```
    "scripts": {
      "watch.dev": "tsc && kill-port 1880 && node-red",
      "watch": "npm-watch"
    },
  ```
3. Restarts the local node-red server

## Publish to npm
Triggred via github actions and repositroy release.

# Node Red Infos:
- https://nodered.org/docs/api/
- https://nodered.org/docs/api/ui/typedInput/
- https://nodered.org/docs/creating-nodes/edit-dialog
- https://nodered.org/docs/creating-nodes/appearance
- https://nodered.org/docs/creating-nodes/status  (render status information below node)
