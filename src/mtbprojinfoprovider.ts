//
// Copyright 2022 by Apollo Software
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
import { theModusToolboxApp } from './mtbappinfo';
import { ModusToolboxEnvVarNames } from './mtbapp/mtbnames';

export class MTBProjectItem extends vscode.TreeItem {
    private children: MTBProjectItem[] ;

    constructor(label: string, desc?: string) {
        super(label) ;

        this.description = desc ;
        this.children = [] ;
    }

    addChild(child: MTBProjectItem) {
        this.children.push(child) ;
        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded ;
    }

    getChildren() : MTBProjectItem[] {
        return this.children ;
    }
}

export class MTBProjectInfoTreeProvider implements vscode.TreeDataProvider<MTBProjectItem> {
    private items_ : MTBProjectItem[] = [] ;
    private onDidChangeTreeData_: vscode.EventEmitter<MTBProjectItem | undefined | null | void> = new vscode.EventEmitter<MTBProjectItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MTBProjectItem | undefined | null | void> = this.onDidChangeTreeData_.event;

    constructor() {
        this.refresh() ;
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

    refresh(): void {
        this.items_ = [] ;

        if (theModusToolboxApp) {
            let value = theModusToolboxApp.getVar(ModusToolboxEnvVarNames.MTB_APP_NAME) ;
            if (value) {
                let item: MTBProjectItem = new MTBProjectItem("APP NAME", value) ;
                this.items_.push(item) ;
            }

            value = theModusToolboxApp.getVar(ModusToolboxEnvVarNames.MTB_TARGET) ;
            if (value) {
                let item: MTBProjectItem = new MTBProjectItem("TARGET", value) ;
                this.items_.push(item) ;
            }

            value = theModusToolboxApp.getVar(ModusToolboxEnvVarNames.MTB_DEVICE) ;
            if (value) {
                let item: MTBProjectItem = new MTBProjectItem("DEVICE", value) ;
                this.items_.push(item) ;
            }

            value = theModusToolboxApp.getVar(ModusToolboxEnvVarNames.MTB_ADDITIONAL_DEVICES) ;
            if (value && value.length > 0) {
                let item: MTBProjectItem = new MTBProjectItem("ADDITIONAL", value) ;
                this.items_.push(item) ;
            }

            value = theModusToolboxApp.getVar(ModusToolboxEnvVarNames.MTB_COMPONENTS) ;
            if (value) {
                let comps :string [] = (value as string).split(' ') ;

                value = theModusToolboxApp.getVar(ModusToolboxEnvVarNames.MTB_DISABLED_COMPONENTS) ;
                let disabled : string[] = (value as string).split(' ') ;
                for(var one in disabled) {
                    let index: number = comps.indexOf(one) ;
                    if (index !== -1) {
                        comps.splice(index) ;
                    }
                }

                let item: MTBProjectItem = new MTBProjectItem("COMPONENTS", "(" + comps.length + ")") ;
                this.items_.push(item) ;
                for(var one of comps) {
                    let sub: MTBProjectItem = new MTBProjectItem(one) ;
                    item.addChild(sub) ;
                }
            }
        }
        else {
            let item: MTBProjectItem = new MTBProjectItem("Load Or Create Project", "") ;
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