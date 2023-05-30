import * as vscode from "vscode";
import { ContractTreeDataProvider, Contract as ContractTreeItem } from "./ContractTreeView/ContractTreeDataProvider";
import { AbiTreeDataProvider, Abi } from "./AbiTreeView/AbiTreeDataProvider";
import { STATE } from "./state";
import { PendingTransactionTreeDataProvider } from "./PendingTransactionTreeView/NodeDependenciesProvider";
import { callContract, create, editInput, sendTransaction } from "./AbiTreeView/functions";
import { deployContract, editContractAddress, refreshContract, updateContractAddress, useContract } from "./ContractTreeView/functions";
import { ConstructorTreeDataProvider } from "./ConstructorTreeView/ConstructorTreeDataProvider";
import { editConstructorInput } from "./ConstructorTreeView/functions";
// import { read } from "./PendingTransactionTreeView/functions";
import fs from 'fs';
import path from 'path';
import { decodeTransactionJson, deleteTransactionJson, editTransactionJson, sendTransactionJson, simulateTransactionJson } from "./PendingTransactionTreeView/functions";
import { send } from "process";
// const settings = {
//   apiKey: "",
//   network: Network.ETH_MAINNET,
// };

// const alchemy = new Alchemy(settings);

const ethcodeExtension: any = vscode.extensions.getExtension("7finney.ethcode");
const api: any = ethcodeExtension.exports;

export async function activate(context: vscode.ExtensionContext) {
  const path_ = vscode.workspace.workspaceFolders;

  if (path_ === undefined) {
    vscode.window.showErrorMessage("No folder selected please open one.");
    return;
  }

  const channel = vscode.window.createOutputChannel("Solidity execute!");

  // Contract Tree View
  const contractTreeDataProvider = new ContractTreeDataProvider(
    vscode.workspace.workspaceFolders?.[0].uri.fsPath
  );

  let contractTreeView = vscode.window.createTreeView("sol-exec.contracts", {
    treeDataProvider: contractTreeDataProvider,
  });

  api.events.contracts.event(() => {
    contractTreeView = vscode.window.createTreeView("sol-exec.contracts", {
      treeDataProvider: contractTreeDataProvider,
    });
  });

  // Abi Tree View
  const abiTreeDataProvider = new AbiTreeDataProvider(
    vscode.workspace.workspaceFolders?.[0].uri.fsPath
  );
  const abiTreeView = vscode.window.createTreeView("sol-exec.abis", {
    treeDataProvider: abiTreeDataProvider,
  });

  abiTreeView.message = "Select a contract and its ABI functions will appear here.";



  // constructor tree view
  const constructorTreeDataProvider = new ConstructorTreeDataProvider(
    vscode.workspace.workspaceFolders?.[0].uri.fsPath
  );

  const constructorTreeView = vscode.window.createTreeView("sol-exec.constructor", {
    treeDataProvider: constructorTreeDataProvider,
  });

  constructorTreeView.message = "Select a contract and its constructor will appear here.";

  // pending transaction tree view
  const pendingTransactionDataProvider = new PendingTransactionTreeDataProvider();

  const pendingTransactionTreeView = vscode.window.createTreeView("sol-exec.pendingTxn", {
    treeDataProvider: pendingTransactionDataProvider,
  });

  pendingTransactionTreeView.message = "Select a contract and its pending transaction will appear here.";

  api.events.contracts.event(() => {
    abiTreeDataProvider.refresh();
    contractTreeDataProvider.refresh();
    constructorTreeDataProvider.refresh();
    updateContractAddress(STATE.currentContract, abiTreeView, constructorTreeView, pendingTransactionTreeView);
  });


  // functions
  context.subscriptions.push(
    // abi
    vscode.commands.registerCommand('sol-exec.editInput', async (input: Abi) => {
      editInput(input, abiTreeDataProvider);
    }),
    vscode.commands.registerCommand('sol-exec.sendTransaction', async (func: Abi) => {
      sendTransaction(func, channel);
    }),
    vscode.commands.registerCommand('sol-exec.callContract', async (func: Abi) => {
      callContract(func, channel);
    }),
    vscode.commands.registerCommand('sol-exec.createTransaction', async (func: Abi) => {
      await create(func, channel, pendingTransactionTreeView);
      
    }),
    // contract 
    vscode.commands.registerCommand("sol-exec.useContract", async (node: ContractTreeItem) => {
      useContract(node, abiTreeDataProvider, abiTreeView, pendingTransactionDataProvider, pendingTransactionTreeView, constructorTreeDataProvider, constructorTreeView);
    }),
    vscode.commands.registerCommand("sol-exec.refreshContracts", async (node: ContractTreeItem) => {
      contractTreeView = await refreshContract(node, contractTreeDataProvider);
    }),
    vscode.commands.registerCommand("sol-exec.deployContract", async (input: any) => {
      channel.appendLine(`Deploying contract ${STATE.currentContract} ...`);
      const contractAddress = await deployContract();
      if (contractAddress) {
        channel.appendLine(`Contract deployed at : ${contractAddress}`);
      } else {
        channel.appendLine(`Contract deployment failed.`);
      }
    }),
    vscode.commands.registerCommand("sol-exec.editContractAddress", async (input: any) => {
      editContractAddress(input);
      updateContractAddress(STATE.currentContract, abiTreeView, constructorTreeView, pendingTransactionTreeView);
    }),
    // constructor
    vscode.commands.registerCommand("sol-exec.editConstructorInput", async (input: any) => {
      editConstructorInput(input, constructorTreeDataProvider);
    }),
    // pending transaction 
    vscode.commands.registerCommand("sol-exec.simulate", async (input: any) => {
      channel.appendLine(`Simulating transaction ...`);
      await simulateTransactionJson(input,channel);
    }),
    vscode.commands.registerCommand("sol-exec.decode", async (input: any) => {
      channel.appendLine(`Decoding transaction ...`);
      await decodeTransactionJson(input,channel);
    }),
    vscode.commands.registerCommand("sol-exec.edit", async (input: any) => {
      channel.appendLine(`Editing transaction ...`);
      await editTransactionJson(input);
    }),
    vscode.commands.registerCommand("sol-exec.send", async (input: any) => {
      channel.appendLine(`Sending transaction ...`);
      sendTransactionJson(input,channel);
    }),
    vscode.commands.registerCommand("sol-exec.delete", async (input: any) => {
      channel.appendLine(`Deleting transaction ...`);
      deleteTransactionJson(input);
    }),
  );

  context.subscriptions.push(abiTreeView);
  context.subscriptions.push(contractTreeView as any);
  context.subscriptions.push(pendingTransactionTreeView);
  context.subscriptions.push(channel);

}

export function deactivate() { }
