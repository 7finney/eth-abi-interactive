import { STATE } from "../state";
import { Abi } from "./AbiTreeDataProvider";
import * as vscode from "vscode";
import * as fs from "fs";
import { Contract, Wallet, ethers } from "ethers";
import { Signer } from "@ethersproject/abstract-signer";
import path from "path";
import { read } from "../PendingTransactionTreeView/functions";
const ethcodeExtension: any = vscode.extensions.getExtension("7finney.ethcode");
const api: any = ethcodeExtension.exports;

async function search(filePath: string, searchString: string, startLine: number = 0) {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();
    const start = text.indexOf(searchString, document.offsetAt(new vscode.Position(startLine, 0)));
    const startPosition = document.positionAt(start);
    return startPosition;
}

async function executeTransaction(contractAddress: string, abi: any[], wallet: Wallet, functionName: string, args: any[]) {
    const contract = new Contract(contractAddress, abi, wallet);
    console.log(args);
    const tx = await contract[functionName](...args);
    const txResponse = await tx.wait();
    // const txResponse = "in development";
    return txResponse;
}

async function callContractFunction(contractAddress: string, abi: any[], functionName: string, args: any[]) {
    const ethcodeProvider = await api.provider.get();
    const contract = new Contract(contractAddress, abi, ethcodeProvider);
    const result = await contract[functionName](...args);
    return result;
}

const editInput = async (input: Abi, abiTreeDataProvider: any) => {
    let filePath = "";
    const path = await vscode.workspace.findFiles(`**/${STATE.currentContract}_functions_input.json`);
    filePath = path[0].fsPath;

    const document = await vscode.workspace.openTextDocument(filePath);
    const lineNumber = await search(filePath, `"name": "${input.parent?.label}"`);
    const line = await search(filePath, `"name": "${input.abi.name}"`, lineNumber.line);

    const cursorPosition = new vscode.Position(line.line + 2, line.character + 10);
    const editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(cursorPosition, cursorPosition);
    editor.revealRange(new vscode.Range(cursorPosition, cursorPosition));

    abiTreeDataProvider.refresh(input);
};

const sendTransaction = async (func: Abi, channel: vscode.OutputChannel) => {
    channel.appendLine(`${func.abi.name}:${func.abi.stateMutability} > `);
    const functionName = func.abi.name;
    const totalArgsCount = func.children.length;
    let countArgs = 0;

    const wallet: any = await api.wallet.get(STATE.currentAccount);
    channel.appendLine(`Selected wallet > ${wallet.address}`);

    const abi = await api.contract.abi(STATE.currentContract);

    const contractAddress = await api.contract.getContractAddress(STATE.currentContract);

    if (contractAddress === "") {
        channel.appendLine(`${STATE.currentContract} contract address not available. Please deploy this contract first.`);
        return;
    }

    // execute the selected function
    const functionArgs: any = [];
    func.children.forEach((item: Abi) => {
        if (item.abi.value !== "") {
            // check if this is payable value
            if (!item.abi.name) {
                functionArgs.push({ value: ethers.utils.parseUnits(item.abi.value.toString(), item.abi.unit) });
            } else {
                functionArgs.push(item.abi.value);
            }
            countArgs++;
        }
        else {
            channel.appendLine(`Error > ${functionName} function's ${item.abi.name} param is empty`);
        }
    });
    if (countArgs !== totalArgsCount) {
        channel.appendLine(`Error > ${functionName} function's arguments are not complete`);
        return;
    }

    executeTransaction(contractAddress, abi, wallet, func.abi.name, functionArgs).then((txResponse: any) => {
        channel.appendLine(`Transaction hash > ${txResponse.transactionHash}`);
    }).catch((err: any) => {
        console.error(err);
        channel.appendLine(`Error > ${err}`);
    });
    channel.show(true);
};

const callContract = async (func: Abi, channel: vscode.OutputChannel) => {
    // channel.appendLine(`${func.abi.name}:${func.abi.stateMutability} > `);
    const abi = await api.contract.abi(STATE.currentContract);
    const contractAddress = await api.contract.getContractAddress(STATE.currentContract);
    const functionName = func.abi.name;
    const totalArgsCount = func.children.length;
    let countArgs = 0;
    if (contractAddress === "") {
        channel.appendLine(`${STATE.currentContract} contract address not available. Please deploy this contract first.`);
        channel.show(true); // show before return
        return;
    }
    const functionArgs: any = [];
    func.children.forEach((item: Abi) => {
        if (item.abi.value !== "") {
            functionArgs.push(item.abi.value);
            countArgs++;
        }
        else {
            channel.appendLine(`Error > ${functionName} function's ${item.abi.name} param is empty`);
        }
    });

    if (countArgs !== totalArgsCount) {
        channel.appendLine(`Error > ${functionName} function's arguments are not complete`);
        channel.show(true); // show before return
        return;
    }

    callContractFunction(contractAddress, abi, func.abi.name, functionArgs).then((response: any) => {
        channel.appendLine(`${func.abi.name}:${func.abi.stateMutability} > ${response}`);
    }).catch((err: any) => {
        console.error(err);
        channel.appendLine(`Error : ${err}`);
    });
    channel.show(true);
};


const generateContractTransaction = async (
    contractAddress: string,
    contractAbi: any,
    functionName: string,
    functionArgs: [],
    wallet: ethers.Wallet,
    provider: any,
    value: any,
) => {
    try {
        const contract = new ethers.Contract(contractAddress, contractAbi, wallet);
        const transaction = await contract.populateTransaction[functionName](
            ...functionArgs,
        );
        const nounce = await wallet.getTransactionCount();
        const gasLimit = await contract.estimateGas[functionName](...functionArgs);
        const gasPrice = await provider.getGasPrice();
        let chainId = await provider.getNetwork();
        chainId = chainId.chainId;
        const tx = {
            to: transaction.to,
            data: transaction.data,
            from: transaction.from,
            value: ethers.utils.parseEther(value.toString()),
            nonce: nounce,
            gasLimit: gasLimit,
            gasPrice: gasPrice,
            chainId: chainId,
        };
        return tx;
    } catch (error: any) {
        if (error.reason === undefined) {
            console.log(`Error: ${error.message}`);
        } else {
            console.log(`Error: ${error.reason}`);
        }
    }
};

const createTransactionObject = async (func: Abi, channel: vscode.OutputChannel) => {
    try {
        const contractAddress = await api.contract.getContractAddress(STATE.currentContract);
        const contractAbi = await api.contract.abi(STATE.currentContract);
        const functionName = func.abi.name;
        const totalArgsCount = func.children.length;
        let countArgs = 0;
        if (contractAddress === "") {
            channel.appendLine(`${STATE.currentContract} contract address not available. Please deploy this contract first.`);
            return;
        }
        const functionArgs: any = [];
        func.children.forEach((item: Abi) => {
            if (item.abi.value !== "") {
                functionArgs.push(item.abi.value);
                countArgs++;
            }
            else {
                channel.appendLine(`Error > ${functionName} function's ${item.abi.name} param is empty`);
            }
        });

        if (countArgs !== totalArgsCount) {
            channel.appendLine(`Error > ${functionName} function's arguments are not complete`);
            return;
        }

        const wallet: any = await api.wallet.get(STATE.currentAccount);
        const provider: any = await api.provider.get();
        const value: any = ethers.utils.parseEther("0");
        const tx = await generateContractTransaction(
            contractAddress,
            contractAbi,
            functionName,
            functionArgs,
            wallet,
            provider,
            value,
        );
        // channel.appendLine(`Transaction: ${tx}`);
        return tx;
    } catch (error) {
        console.error(error);
    }
};

const createDirectoryIfNotExists = (path: string): void => {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
    }
};

const checkFolder = async (folderName: any) => {
    try {
        const basePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (basePath === undefined) {
            throw new Error("No workspace folder found");
        }
        const folderPath = path.join(basePath, `artifacts`,`sol-exec`,`${STATE.currentContract}.sol`, folderName);
        createDirectoryIfNotExists(folderPath);
        return folderPath;
    } catch (error: any) {
        if (error.reason === undefined) {
            console.log(`Error: ${error.message}`);
        } else {
            console.log(`Error: ${error.reason}`);
        }
    }
};

const writeTransaction = async (tx: any, functionName: any) => {
    try {
        const folderPath = await checkFolder(`${functionName}`);
        const epochTime = Date.now();
        fs.writeFileSync(`${path.join(`${folderPath}`,`${epochTime}_tx.json`)}`, JSON.stringify(tx,null,2));
        return `${path.join(`${folderPath}`,`${epochTime}_tx.json`)}`;
    } catch (error: any) {
        if (error.reason === undefined) {
            console.log(`Error: ${error.message}`);
        } else {
            console.log(`Error: ${error.reason}`);
        }
    }
};

const create = async (func: Abi, channel: vscode.OutputChannel) => {
    channel.appendLine(`Creating transaction ${func.abi.name} ...`);
    const tx = await createTransactionObject(func, channel);
    const path = await writeTransaction(tx, func.abi.name);
    channel.appendLine(`Transaction created successfully`);
    await read();
    return;
};

export {
    editInput,
    sendTransaction,
    callContract,
    create,
    checkFolder
};