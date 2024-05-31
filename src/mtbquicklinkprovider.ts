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
import * as fs from 'fs';
import * as path from 'path';
import { MTBAssistItem } from './mtbitem' ;
import { MTBLaunchConfig } from './mtblaunchdata';
import { MTBAssistCommand } from './mtbassistcmd';
import { getModusToolboxApp } from './mtbapp/mtbappinfo';

export class MTBQuickLinksProvider implements vscode.TreeDataProvider<MTBAssistItem> {
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
        let retval : MTBAssistItem[] = [] ;

        if (!element) {
            retval = this.items_ ;
        }
        else {
            retval = element.getChildren() ;
        }

        return Promise.resolve(retval) ;
    }

    refresh(configs?: MTBLaunchConfig[]): void {
        var item ;

        item = new MTBAssistItem("Build Application") ;
        item.command = new MTBAssistCommand("Build", "workbench.action.tasks.runTask", "Build the project", [ "Build"]) ;
        this.items_.push(item) ;

        item = new MTBAssistItem("Rebuild Application") ;
        item.command = new MTBAssistCommand("Rebuild", "workbench.action.tasks.runTask", "Rebuild all source for the project", [ "Rebuild"]) ;        
        this.items_.push(item) ;
        
        item = new MTBAssistItem("Clean Application") ;
        item.command = new MTBAssistCommand("Clean", "workbench.action.tasks.runTask", "Delete all build artifacts for the project", [ "Clean"]) ;        
        this.items_.push(item) ;       
        
        item = new MTBAssistItem("Erase Application") ;
        item.command = new MTBAssistCommand("Erase", "workbench.action.tasks.runTask", "Erase the device memory", [ "Erase"]) ;        
        this.items_.push(item) ;       
        
        item = new MTBAssistItem("Program Application") ;
        item.command = new MTBAssistCommand("Program", "workbench.action.tasks.runTask", "Program the program into device memory", [ "Program"]) ;        
        this.items_.push(item) ;        
    }
}

let links : MTBQuickLinksProvider | undefined = undefined ;

export function getMTBQuickLinksTreeProvider() : MTBQuickLinksProvider {
    if (links === undefined) {
        links = new MTBQuickLinksProvider() ;
    }
    
    return links ;
}
