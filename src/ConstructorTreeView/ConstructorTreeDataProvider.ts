import * as vscode from "vscode";
import { STATE } from "../state";

const ethcodeExtension: any = vscode.extensions.getExtension("7finney.ethcode");
const api: any = ethcodeExtension.exports;

export class Constructor extends vscode.TreeItem {
  contextValue: string;
  constructor(
    public readonly label: string,
    public readonly value: any,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.contextValue = "constructor";
    this.description = value.type + " : " + value.value;
  }

  command = {
    title: "Edit Value",
    command: "sol-exec.editConstructorInput",
    arguments: [this],
  };

  iconPath = new vscode.ThemeIcon("symbol-method");
}

export class ConstructorTreeDataProvider implements vscode.TreeDataProvider<Constructor> {
  constructor(private workspaceRoot: string | undefined) {}

  getTreeItem(element: Constructor): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: Constructor): Promise<Constructor[]> {
    const leaves: Constructor[] = [];
    try {
      const constructorInputsEthcode: Array<any> = await api.contract.getConstructorInput(STATE.currentContract);
        if (!element && constructorInputsEthcode && constructorInputsEthcode.length > 0) {
          for (const entry of constructorInputsEthcode) {
              leaves.push(
                  new Constructor(
                      entry.name,
                      entry,
                      vscode.TreeItemCollapsibleState.None
                  )
              );
          }
      }
      return leaves;
    } catch (error) {
        console.error(error);
        return leaves;
    }
  }

  private _onDidChangeTreeData: vscode.EventEmitter<Constructor | undefined> =
    new vscode.EventEmitter<Constructor | undefined>();
  readonly onDidChangeTreeData: vscode.Event<Constructor | undefined> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}