import { extensions, TreeDataProvider, TreeItem, TreeItemCollapsibleState, EventEmitter, Event, ThemeIcon } from 'vscode';
import { STATE } from '../state';
import { Abi } from './AbiTreeItem';

const ethcodeExtension: any = extensions.getExtension('7finney.ethcode');
const api: any = ethcodeExtension.exports;

export { Abi } from './AbiTreeItem';
export class AbiTreeDataProvider implements TreeDataProvider<Abi> {
  constructor() {}

  getTreeItem(element: Abi): TreeItem {
    return element;
  }

  async getChildren(element?: Abi): Promise<Abi[]> {
    const leaves = [];
    const inputsEthcode: any = await api.contract.getFunctionInput(STATE.currentContract);
    if (!element) {
      const abi = await api.contract.abi(STATE.currentContract);
      
      for (const entry of abi) {
        if (entry.type === "function" ) {
          const payableEntry = entry.stateMutability === "payable" ? Object.assign({ ...entry }, { inputs: [{ value: 0 }] }) : entry;
          // payable entry should look like - {inputs: Array(1), name: 'store', outputs: Array(0), stateMutability: 'nonpayable', type: 'function'}
          const colapse = (payableEntry.inputs && payableEntry.inputs.length > 0)
            ? TreeItemCollapsibleState.Expanded
            : TreeItemCollapsibleState.None;
          leaves.push(
            new Abi(
              entry.name,
              entry,
              entry.stateMutability === "view" || entry.stateMutability === "pure" ? "abiReadFunction" : "abiFunction",
              null,
              [],
              colapse
            )
          );
        }
      }
    } else if (element.abi.type === "function") {
      const value = inputsEthcode.find((i: any) => i.name === element.abi.name);
      for (const input of value.inputs) {
        leaves.push(
          new Abi(
            (!input.name && value.stateMutability === "payable") ? "payableValue" : input.name,
            input,
            "abiInput",
            element,
            [],
            TreeItemCollapsibleState.None
          )
        );
      }
      element.children = leaves;
    }
    return leaves;
  }

  private _onDidChangeTreeData: EventEmitter<Abi | undefined> = new EventEmitter<Abi | undefined>();
  readonly onDidChangeTreeData: Event<Abi | undefined> = this._onDidChangeTreeData.event;

  refresh(item?: Abi): void {
    this._onDidChangeTreeData.fire(item);
  }
}
