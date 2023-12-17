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
import { AppType } from './mtbapp/mtbappinfo';
import { ModusToolboxEnvVarNames } from './mtbapp/mtbnames';
import { MTBProjectInfo } from './mtbapp/mtbprojinfo';

export class MTBProjectItem extends vscode.TreeItem {

    private children_: MTBProjectItem[] ;

    constructor(label: string, desc?: string) {
        super(label) ;

        this.description = desc ;
        this.children_ = [] ;
    }

    addChild(child: MTBProjectItem) {
        this.children_.push(child) ;
        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded ;
    }

    getChildren() : MTBProjectItem[] {
        return this.children_ ;
    }

    setChildren(c: MTBProjectItem[]) {
        this.children_ = c ;
        if (this.children_.length > 0) {
            this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded ;
        } 
        else {
            this.collapsibleState = vscode.TreeItemCollapsibleState.None ;
        }
    }
}

export class MTBProjectInfoTreeProvider implements vscode.TreeDataProvider<MTBProjectItem> {
    private emptyLabel = "ModusToolbox Application Not Loaded" ;
    private projectTypeLabel = "Type:" ;
    
    private items_ : MTBProjectItem[] = [] ;
    private onDidChangeTreeData_: vscode.EventEmitter<MTBProjectItem | undefined | null | void> = new vscode.EventEmitter<MTBProjectItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MTBProjectItem | undefined | null | void> = this.onDidChangeTreeData_.event;

    constructor() {
        this.refresh(undefined) ;
    }

    getTreeItem(element: MTBProjectItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MTBProjectItem) : Thenable<MTBProjectItem[]> {
        let retval : MTBProjectItem[] = [] ;

        if (!element) {
            retval = this.items_ ;
        }
        else {
            retval = element.getChildren() ;
        }
        
        return Promise.resolve(retval) ;
    }

    findTopLevelChild(name: string) : MTBProjectItem | undefined {
        let ret : MTBProjectItem | undefined = undefined ;

        for(let item of this.items_) {
            if (item.label && item.label === name) {
                ret = item ;
                break ;
            }
        }

        return ret ;
    }

    refresh(projinfo?: MTBProjectInfo): void {

        if (projinfo) {
            if (this.items_.length === 1 && this.items_[0].label === this.emptyLabel) {
                this.items_ = [] ;

                let value: string = "Unknown" ;

                if (projinfo.app.appType === AppType.mtb2x) {
                    value = "MTB 2.X Project" ;
                }
                else if (projinfo.app.appType === AppType.multicore) {
                    value = "MTB 3.X Multi Core Project" ;
                }
                else if (projinfo.app.appType === AppType.combined) {
                    value = "MTB 3.X Single Core Project" ;
                }
                let item: MTBProjectItem = new MTBProjectItem("PROJECT TYPE", value) ;
                this.items_.push(item) ;
            }

            let parent: MTBProjectItem | undefined = this.findTopLevelChild(projinfo.name) ;

            if (!parent) {
                parent = new MTBProjectItem(projinfo.name) ;
                this.items_.push(parent) ;
            }

            parent.setChildren([]) ;

            let value = projinfo.getVar(ModusToolboxEnvVarNames.MTB_APP_NAME) ;
            if (value) {
                let item: MTBProjectItem = new MTBProjectItem("APP NAME", value) ;
                parent.addChild(item) ;
            }

            value = projinfo.getVar(ModusToolboxEnvVarNames.MTB_TARGET) ;
            if (value) {
                let item: MTBProjectItem = new MTBProjectItem("TARGET", value) ;
                parent.addChild(item) ;
            }

            value = projinfo.getVar(ModusToolboxEnvVarNames.MTB_DEVICE) ;
            if (value) {
                let item: MTBProjectItem = new MTBProjectItem("DEVICE", value) ;
                parent.addChild(item) ;
            }

            value = projinfo.getVar(ModusToolboxEnvVarNames.MTB_ADDITIONAL_DEVICES) ;
            if (value && value.length > 0) {
                let item: MTBProjectItem = new MTBProjectItem("ADDITIONAL", value) ;
                parent.addChild(item) ;
            }

            let comps = projinfo.getComponents() ;
            let item: MTBProjectItem = new MTBProjectItem("COMPONENTS", "(" + comps.length + ")") ;
            parent.addChild(item) ;
            for(var one of comps) {
                let sub: MTBProjectItem = new MTBProjectItem(one) ;
                item.addChild(sub) ;
            }
        }
        else {
            let item: MTBProjectItem = new MTBProjectItem(this.emptyLabel, "") ;
            this.items_ = [] ;
            this.items_.push(item) ;
        }

        this.onDidChangeTreeData_.fire();
    }
}

let projinfo : MTBProjectInfoTreeProvider | undefined ;

export function getMTBProjectInfoProvider() : MTBProjectInfoTreeProvider {
    if (projinfo === undefined) {
        projinfo = new MTBProjectInfoTreeProvider() ;
    }
    
    return projinfo ;
}