import * as vscode from "vscode";

const ethcodeExtension: any = vscode.extensions.getExtension("7finney.ethcode");
const api: any = ethcodeExtension.exports;

export class AccountTreeDataProvider implements vscode.TreeDataProvider<Account> {

  constructor(private workspaceRoot: string | undefined) {}

  getTreeItem(element: Account): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: Account): Promise<Account[]> {
    const accounts: string[] = await api.wallet.list();
    console.log(accounts);
    if (accounts.length === 0) {
      vscode.window.showInformationMessage("No Accounts in Ethcode");
      return [];
    } else {
      const leaves = [];
      for (const file of accounts) {
        leaves.push(new Account(file, vscode.TreeItemCollapsibleState.None));
      }
      return leaves;
    }
  }

  private _onDidChangeTreeData: vscode.EventEmitter<Account | undefined> =
    new vscode.EventEmitter<Account | undefined>();
  readonly onDidChangeTreeData: vscode.Event<Account | undefined> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

export class Account extends vscode.TreeItem {
  contextValue: string;
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.contextValue = "account";
  }

  command = {
    title: "Use Account",
    command: "sol-exec.useAccount",
    arguments: [this],
  };

  iconPath = new vscode.ThemeIcon("account");
}
