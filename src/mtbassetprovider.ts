import * as vscode from 'vscode';
import { MTBItem } from './manifest/mtbitem';
import { MtbManifestDb } from './manifest/mtbmanifestdb';
import { MTBAssetInstance } from './mtbassets';
import { MTBExtensionInfo } from './mtbextinfo';
import { MTBAssistCommand } from './mtbglobal';

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
            for(var asset of assets) {
                let item = new MTBAssetItem(asset.id + ", " + asset.version) ;
                let mandb: MtbManifestDb = MTBExtensionInfo.getMtbExtensionInfo().manifestDb ;
                if (mandb.isLoaded) {
                    if (asset.id && asset.version) {
                        let mitem: MTBItem | undefined = mandb.findItemByID(asset.id) ;
                        if (mitem) {
                            let versions: string[] = mitem.newerVersions(asset.version!) ;
                            if (versions.length > 0) {
                                item.label = "* " + item.label ;
                                item.tooltip = versions.join(', ') ;
                            }
                            else {
                                item.tooltip = "No New Versions Available" ;
                            }
                            
                            item.command = new MTBAssistCommand("Run Library Manager", "mtbassist.mtbRunLibraryManager", "Run Library Manager") ;
                        }
                    }
                }
                else if (mandb.hadError) {
                    item.tooltip = "Error loading manifest file" ;
                }
                else if (mandb.isLoading) {
                    item.tooltip = "Loading manifest file ..." ;
                }
                this.items_.push(item) ;
            } ;
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