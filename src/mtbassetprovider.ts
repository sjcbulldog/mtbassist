import * as vscode from 'vscode';
import { MTBAssetInstance } from './mtbassets';

export class MTBAssetItem extends vscode.TreeItem {
    constructor(label: string) {
        super(label) ;
    }
}

export class MTBAssistAssetProvider implements vscode.TreeDataProvider<MTBAssetItem> {
    private items_ : MTBAssetItem[] = [] ;
    private onDidChangeTreeData_: vscode.EventEmitter<MTBAssetItem | undefined | null | void> = new vscode.EventEmitter<MTBAssetItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MTBAssetItem | undefined | null | void> = this.onDidChangeTreeData_.event;

    constructor() {
        this.refresh(undefined) ;
    }

    getTreeItem(element: MTBAssetItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MTBAssetItem) : Thenable<MTBAssetItem[]> {
        let retval : MTBAssetItem[] = [] ;

        if (!element) {
            retval = this.items_ ;
        }
        return Promise.resolve(retval) ;
    }

    refresh(assets?: MTBAssetInstance[]): void {
        this.items_ = [] ;

        if (assets) {
            assets.forEach(asset => {
                let item = new MTBAssetItem(asset.name + ", " + asset.version) ;
                this.items_.push(item) ;
            }) ;
        }

        this.onDidChangeTreeData_.fire();
    }
}


let assets : MTBAssistAssetProvider | undefined ;

export function getMTBAssetProvider() : MTBAssistAssetProvider {
    if (assets === undefined) {
        assets = new MTBAssistAssetProvider() ;
    }
    
    return assets ;
}