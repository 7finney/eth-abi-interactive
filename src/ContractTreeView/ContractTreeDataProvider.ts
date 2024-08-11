import * as vscode from "vscode";

const ethcodeExtension: any = vscode.extensions.getExtension("7finney.ethcode");
const api: any = ethcodeExtension.exports;

export class ContractTreeDataProvider
  implements vscode.TreeDataProvider<Contract>
{
  constructor() {}

  getTreeItem(element: Contract): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<Contract[]> {
    const contracts: string[] = await api.contract.list();
    if (contracts.length === 0) {
      vscode.window.showInformationMessage("No Contracts in empty workspace");
      return [];
    } else {
      const leaves = [];
      for (const file of contracts) {
        leaves.push(new Contract(file, vscode.TreeItemCollapsibleState.None));
      }
      return leaves;
    }
  }

  private _onDidChangeTreeData: vscode.EventEmitter<Contract | undefined> =
    new vscode.EventEmitter<Contract | undefined>();
  readonly onDidChangeTreeData: vscode.Event<Contract | undefined> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

export class Contract extends vscode.TreeItem {
  contextValue: string;
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.contextValue = "contract";
  }

  command = {
    title: "Use Contract",
    command: "sol-exec.useContract",
    arguments: [this],
  };

  iconPath = new vscode.ThemeIcon("file-code");
}
