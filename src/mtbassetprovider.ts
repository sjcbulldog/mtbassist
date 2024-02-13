//
// Copyright 2023 by C And T Software
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// 	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import * as vscode from 'vscode';
import { MTBItem } from './manifest/mtbitem';
import { MtbManifestDb } from './manifest/mtbmanifestdb';
import { MTBAssetInstance } from './mtbapp/mtbassets';
import { MTBExtensionInfo } from './mtbextinfo';
import { MTBAssistCommand } from './mtbassistcmd';

export class MTBAssetItem extends vscode.TreeItem {
    private children_ : MTBAssetItem[] ;

    constructor(label: string) {
        super(label) ;

        this.children_ = [] ;
    }

    setChildren(c: MTBAssetItem[]) {
        this.children_ = c ;
        if (this.children_.length > 0) {
            this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded ;
        } 
        else {
            this.collapsibleState = vscode.TreeItemCollapsibleState.None ;
        }
    }

    getChildren() : MTBAssetItem[] {
        return this.children_ ;
    }

    addChild(child: MTBAssetItem) {
        this.children_.push(child) ;
        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded ;
    }
}

export class MTBAssistAssetProvider implements vscode.TreeDataProvider<MTBAssetItem> {
    private items_ : MTBAssetItem[] = [] ;
    private onDidChangeTreeData_: vscode.EventEmitter<MTBAssetItem | undefined | null | void> = new vscode.EventEmitter<MTBAssetItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MTBAssetItem | undefined | null | void> = this.onDidChangeTreeData_.event;

    constructor() {
        this.refresh(undefined, undefined) ;
    }

    getTreeItem(element: MTBAssetItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MTBAssetItem) : Thenable<MTBAssetItem[]> {
        let retval : MTBAssetItem[] = [] ;

        if (!element) {
            retval = this.items_ ;
        }
        else {
            retval = element.getChildren() ;
        }
        return Promise.resolve(retval) ;
    }

    findTopLevelChild(name: string) : MTBAssetItem | undefined {
        let ret : MTBAssetItem | undefined = undefined ;

        for(let item of this.items_) {
            if (item.label && item.label === name) {
                ret = item ;
                break ;
            }
        }

        return ret ;
    }

    refresh(name? : string, assets?: MTBAssetInstance[]): void {
        if (name && assets) {
            let parent: MTBAssetItem | undefined = this.findTopLevelChild(name) ;

            if (!parent) {
                parent = new MTBAssetItem(name) ;
                this.items_.push(parent) ;
            }

            parent.setChildren([]) ;
            for(var asset of assets) {
                let item = new MTBAssetItem(asset.id + ", " + asset.version) ;
                let mandb: MtbManifestDb = MTBExtensionInfo.getMtbExtensionInfo().manifestDb! ;
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
                parent.addChild(item) ;
            } ;
        }
        else {
            this.items_ = [] ;
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