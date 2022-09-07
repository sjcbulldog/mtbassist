import * as vscode from 'vscode';
import { MTBInfo } from './mtbinfo';
import { MTBAssistItem } from './mtbitem' ;
import { MTBLaunchDoc } from './mtblaunchdata';

export class MTBAssistDocumentProvider implements vscode.TreeDataProvider<MTBAssistItem> {
    private items_ : MTBAssistItem[] = [] ;
    private onDidChangeTreeData_: vscode.EventEmitter<MTBAssistItem | undefined | null | void> = new vscode.EventEmitter<MTBAssistItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MTBAssistItem | undefined | null | void> = this.onDidChangeTreeData_.event;

    constructor() {
        this.refresh(undefined) ;
    }

    getTreeItem(element: MTBAssistItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MTBAssistItem) : Thenable<MTBAssistItem[]> {
        return Promise.resolve(this.items_) ;
    }

    refresh(info?: MTBInfo) {
        if (info !== undefined) {
            info.launch.docs.forEach((doc) => {
                let item : MTBAssistItem = new MTBAssistItem(doc.title) ;
                item.doc = doc ;
                this.items_.push(item) ;
            }) ;
        }
        this.onDidChangeTreeData_.fire();
    }
}
