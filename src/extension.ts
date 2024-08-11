import * as vscode from "vscode";
import { ContractTreeDataProvider, Contract as ContractTreeItem } from "./ContractTreeView/ContractTreeDataProvider";
import { AbiTreeDataProvider, Abi } from "./AbiTreeView/AbiTreeDataProvider";
import { STATE } from "./state";
import { PendingTransactionTreeDataProvider } from "./PendingTransactionTreeView/NodeDependenciesProvider";
import { callContract, create, editInput, sendTransaction } from "./AbiTreeView/functions";
import { deployContract, editContractAddress, refreshContract, updateContractAddress, useContract } from "./ContractTreeView/functions";
import { ConstructorTreeDataProvider } from "./ConstructorTreeView/ConstructorTreeDataProvider";
import { editConstructorInput } from "./ConstructorTreeView/functions";
import { decodeTransactionJson, deleteTransactionJson, editTransactionJson, sendTransactionJson, simulateTransactionJson } from "./PendingTransactionTreeView/functions";
import { Account, AccountTreeDataProvider } from "./AccountTreeView/AccountTreeDataProvider";
import { updateMsg } from "./AccountTreeView/funtions";

const ethcodeExtension: any = vscode.extensions.getExtension("7finney.ethcode");
const api: any = ethcodeExtension.exports;

export async function activate(context: vscode.ExtensionContext) {
  const path_ = vscode.workspace.workspaceFolders;

  if (path_ === undefined) {
    vscode.window.showErrorMessage("No folder selected please open one.");
    return;
  }

  const channel = vscode.window.createOutputChannel("Solidity execute!");

  // Accout Tree View
  const accountTreeDataProvider = new AccountTreeDataProvider(
    vscode.workspace.workspaceFolders?.[0].uri.fsPath
  );

  const accountTreeView = vscode.window.createTreeView("sol-exec.account", {
    treeDataProvider: accountTreeDataProvider,
  });

  if (STATE.currentAccount === undefined) {
    accountTreeView.message = "No account selected";
  } else {
    accountTreeView.message = `${STATE.currentAccount} | ${api.provider.network.get()}`;
  }
  // Contract Tree View
  const contractTreeDataProvider = new ContractTreeDataProvider();

  let contractTreeView = vscode.window.createTreeView("sol-exec.contracts", {
    treeDataProvider: contractTreeDataProvider,
  });

  api.events.contracts.event(() => {
    contractTreeView = vscode.window.createTreeView("sol-exec.contracts", {
      treeDataProvider: contractTreeDataProvider,
    });
  });

  // Abi Tree View
  const abiTreeDataProvider = new AbiTreeDataProvider();
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

  api.events.updateAccountList.event(() => {
    accountTreeDataProvider.refresh();
  });

    api.events.network.event(async (network: string) => {
      console.log("network", network);
      STATE.currentNetwork = network;
      updateMsg(accountTreeView);
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
      channel.show(true);
      callContract(func, channel);
    }),
    vscode.commands.registerCommand('sol-exec.createTransaction', async (func: Abi) => {
      await create(func, channel);
      pendingTransactionDataProvider.refresh();

    }),
    // contract 
    vscode.commands.registerCommand("sol-exec.useContract", async (node: ContractTreeItem) => {
      useContract(node, abiTreeDataProvider, abiTreeView, pendingTransactionDataProvider, pendingTransactionTreeView, constructorTreeDataProvider, constructorTreeView);
    }),
    vscode.commands.registerCommand("sol-exec.refreshContracts", async (node: ContractTreeItem) => {
      contractTreeView = await refreshContract(node, contractTreeDataProvider);
    }),
    vscode.commands.registerCommand("sol-exec.deployContract", async () => {
      channel.show(true);
      const contractAddress = await deployContract(channel);
      if (contractAddress) {
        channel.appendLine(`${STATE.currentContract} contract address > ${contractAddress}`);
      } else {
        channel.appendLine(`${STATE.currentContract} contract deployment failed.`);
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
      await simulateTransactionJson(input, channel);
      pendingTransactionDataProvider.refresh();
    }),
    vscode.commands.registerCommand("sol-exec.decode", async (input: any) => {
      await decodeTransactionJson(input, channel);
      pendingTransactionDataProvider.refresh();
    }),
    vscode.commands.registerCommand("sol-exec.edit", async (input: any) => {
      await editTransactionJson(input);
      pendingTransactionDataProvider.refresh();
    }),
    vscode.commands.registerCommand("sol-exec.send", async (input: any) => {
      sendTransactionJson(input, channel);
      pendingTransactionDataProvider.refresh();
    }),
    vscode.commands.registerCommand("sol-exec.delete", async (input: any) => {
      deleteTransactionJson(input);
      pendingTransactionDataProvider.refresh();
    }),
    // account
    vscode.commands.registerCommand("sol-exec.createAccount", async () => {
      channel.show(true);
      await vscode.commands.executeCommand("ethcode.account.create");
    }),
    vscode.commands.registerCommand("sol-exec.exportAccount", async () => {
      channel.show(true);
      await vscode.commands.executeCommand("ethcode.account.export");
    }),
    vscode.commands.registerCommand("sol-exec.importAccount", async () => {
      channel.show(true);
      await vscode.commands.executeCommand("ethcode.account.import");
    }),
    vscode.commands.registerCommand("sol-exec.useAccount", async (node: Account) => {
      channel.show(true);
      STATE.currentAccount = node.label;
      updateMsg(accountTreeView);
    }),
    vscode.commands.registerCommand("sol-exec.copyAccountAddress", async (node: any) => {
      channel.show(true);
      vscode.env.clipboard.writeText(node.label);
    }),
    vscode.commands.registerCommand("sol-exec.selectNetwork", async () => {
      channel.show(true);
      await vscode.commands.executeCommand("ethcode.network.select");
    }),
  );

  context.subscriptions.push(abiTreeView);
  context.subscriptions.push(contractTreeView as any);
  context.subscriptions.push(pendingTransactionTreeView);
  context.subscriptions.push(channel);

}

export function deactivate() { }

function fetch(apiURL: string) {
  throw new Error("Function not implemented.");
}

