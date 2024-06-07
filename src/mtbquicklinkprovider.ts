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
import { MTBAppInfo, getModusToolboxApp } from './mtbapp/mtbappinfo';

export class MTBQuickLinksProvider implements vscode.TreeDataProvider<MTBAssistItem> {
    private items_ : MTBAssistItem[] = [] ;
    private onDidChangeTreeData_: vscode.EventEmitter<MTBAssistItem | undefined | null | void> = new vscode.EventEmitter<MTBAssistItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MTBAssistItem | undefined | null | void> = this.onDidChangeTreeData_.event;

    constructor() {
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

    refresh(): void {
        var item ;

        this.items_ = [] ;

        let appinfo: MTBAppInfo | undefined = getModusToolboxApp() ;
        if (appinfo === undefined || appinfo.tasks === undefined) {
            this.onDidChangeTreeData_.fire(undefined) ;
            return ;
        }

        //
        // First lets take care of the application level items
        //
        if (appinfo.tasks !== undefined) {
            if (appinfo.tasks.doesTaskExist("Erase")) {
                item = new MTBAssistItem("Erase Device") ;
                item.command = new MTBAssistCommand("Erase", "workbench.action.tasks.runTask", "Erase the device memory", [ "Erase"]) ;        
                this.items_.push(item) ;
            }

            let app: MTBAssistItem = new MTBAssistItem("Application") ;
            this.items_.push(app) ;

            if (appinfo.tasks.doesTaskExist("Build")) {
                item = new MTBAssistItem("Build") ;
                item.command = new MTBAssistCommand("Build", "workbench.action.tasks.runTask", "Build the application", [ "Build"]) ;
                app.addChild(item) ;
            }

            if (appinfo.tasks.doesTaskExist("Rebuild")) {
                item = new MTBAssistItem("Rebuild") ;
                item.command = new MTBAssistCommand("Rebuild", "workbench.action.tasks.runTask", "Rebuild all source for the project", [ "Rebuild"]) ;        
                app.addChild(item) ;
            }

            if (appinfo.tasks.doesTaskExist("Clean")) {
                item = new MTBAssistItem("Clean") ;
                item.command = new MTBAssistCommand("Clean", "workbench.action.tasks.runTask", "Delete all build artifacts for the project", [ "Clean"]) ;        
                app.addChild(item) ;
            }

            if (appinfo.tasks.doesTaskExist("Program")) {
                item = new MTBAssistItem("Program") ;
                item.command = new MTBAssistCommand("Program", "workbench.action.tasks.runTask", "Program the program into device memory", [ "Program"]) ;        
                app.addChild(item) ;
            }
        }

        //
        // Now, lets process each project
        //
        if (appinfo.projects.length > 1) {
            for(let projinfo of appinfo.projects) {
                let app: MTBAssistItem = new MTBAssistItem(projinfo.name) ;
                this.items_.push(app) ;

                if (appinfo.tasks.doesTaskExist("Build " + projinfo.name)) {
                    item = new MTBAssistItem("Build") ;
                    item.command = new MTBAssistCommand("Build", "workbench.action.tasks.runTask", "Build the application", [ "Build " + projinfo.name]) ;
                    app.addChild(item) ;
                }

                if (appinfo.tasks.doesTaskExist("Rebuild " + projinfo.name)) {
                    item = new MTBAssistItem("Rebuild") ;
                    item.command = new MTBAssistCommand("Rebuild", "workbench.action.tasks.runTask", "Rebuild all source for the project", [ "Rebuild "  + projinfo.name]) ;
                    app.addChild(item) ;
                }

                if (appinfo.tasks.doesTaskExist("Clean" + projinfo.name)) {
                    item = new MTBAssistItem("Clean") ;
                    item.command = new MTBAssistCommand("Clean", "workbench.action.tasks.runTask", "Delete all build artifacts for the project", [ "Clean " + projinfo.name]) ;
                    app.addChild(item) ;
                }

                if (appinfo.tasks.doesTaskExist("Program " + projinfo.name)) {
                    item = new MTBAssistItem("Program") ;
                    item.command = new MTBAssistCommand("Program", "workbench.action.tasks.runTask", "Program the program into device memory", [ "Program " + projinfo.name]) ;
                    app.addChild(item) ;
                }                
            }
        }

        this.onDidChangeTreeData_.fire(undefined) ;        
    }
}

let links : MTBQuickLinksProvider | undefined = undefined ;

export function getMTBQuickLinksTreeProvider() : MTBQuickLinksProvider {
    if (links === undefined) {
        links = new MTBQuickLinksProvider() ;
    }
    
    return links ;
}
