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
import { AppType, MTBAppInfo, getModusToolboxApp } from './mtbapp/mtbappinfo';
import { MTBTasks } from './mtbapp/mtbtasks';

const runTaskCmd = "workbench.action.tasks.runTask" ;

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

        if (!appinfo.tasks.isValid()) {
            item = new MTBAssistItem("The file 'tasks.json' is not a valid tasks file") ;
            this.items_.push(item) ;
            return ;
        }

        if (appinfo.appType === AppType.combined) {
            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameBuild)) {
                item = new MTBAssistItem(MTBTasks.taskNameBuild) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameBuild, runTaskCmd, "Build the application", [ MTBTasks.taskNameBuild ]) ;
                this.items_.push(item) ;
            }

            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameRebuild)) {
                item = new MTBAssistItem(MTBTasks.taskNameRebuild) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameRebuild, runTaskCmd, "Rebuild all source for the application", [ MTBTasks.taskNameRebuild]) ;
                this.items_.push(item) ;
            }

            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameClean)) {
                item = new MTBAssistItem(MTBTasks.taskNameClean) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameClean, runTaskCmd, "Delete all build artifacts for the application", [ MTBTasks.taskNameClean]) ;
                this.items_.push(item) ;
            }

            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameBuildProgram)) {
                item = new MTBAssistItem(MTBTasks.taskNameBuildProgram) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameBuildProgram, runTaskCmd, "Build the application and program into device memory", [ MTBTasks.taskNameBuildProgram]) ;
                this.items_.push(item) ;
            }

            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameProgram)) {
                item = new MTBAssistItem(MTBTasks.taskNameProgram) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameProgram, runTaskCmd, "Program the application into device memory", [ MTBTasks.taskNameProgram]) ;
                this.items_.push(item) ;
            }            

            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameErase)) {
                item = new MTBAssistItem(MTBTasks.taskNameErase) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameErase, runTaskCmd, "Erase the device", [ MTBTasks.taskNameErase]) ;
                this.items_.push(item) ;
            }
        }
        else {
            //
            // First lets take care of the application level items
            //
            if (appinfo.tasks !== undefined) {
                let app: MTBAssistItem = new MTBAssistItem("Application") ;
                this.items_.push(app) ;             

                if (appinfo.tasks.doesTaskExist("Build")) {
                    item = new MTBAssistItem("Build") ;
                    item.command = new MTBAssistCommand("Build", runTaskCmd, "Build the application", [ "Build"]) ;
                    app.addChild(item) ;
                }

                if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameRebuild)) {
                    item = new MTBAssistItem(MTBTasks.taskNameRebuild) ;
                    item.command = new MTBAssistCommand(MTBTasks.taskNameRebuild, runTaskCmd, "Clean and build the application", [ MTBTasks.taskNameRebuild]) ;
                    app.addChild(item) ;
                }

                if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameClean)) {
                    item = new MTBAssistItem(MTBTasks.taskNameClean) ;
                    item.command = new MTBAssistCommand(MTBTasks.taskNameClean, runTaskCmd, "Delete all build artifacts for the application", [ MTBTasks.taskNameClean]) ;
                    app.addChild(item) ;
                }

                if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameBuildProgram)) {
                    item = new MTBAssistItem(MTBTasks.taskNameBuildProgram) ;
                    item.command = new MTBAssistCommand(MTBTasks.taskNameBuildProgram, runTaskCmd, "Build the application and program into device memory", [ MTBTasks.taskNameBuildProgram]) ;
                    app.addChild(item) ;
                }

                if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameProgram)) {
                    item = new MTBAssistItem(MTBTasks.taskNameProgram) ;
                    item.command = new MTBAssistCommand(MTBTasks.taskNameProgram, runTaskCmd, "Build the application and program into device memory", [ MTBTasks.taskNameProgram]) ;
                    app.addChild(item) ;
                }                

                if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameErase)) {
                    item = new MTBAssistItem(MTBTasks.taskNameErase) ;
                    item.command = new MTBAssistCommand(MTBTasks.taskNameErase, runTaskCmd, "Erase the device", [ MTBTasks.taskNameErase]) ;
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
                        item.command = new MTBAssistCommand("Build", runTaskCmd, "Build the application", [ "Build " + projinfo.name]) ;
                        app.addChild(item) ;
                    }

                    if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameRebuild + " " + projinfo.name)) {
                        item = new MTBAssistItem(MTBTasks.taskNameRebuild) ;
                        item.command = new MTBAssistCommand(MTBTasks.taskNameRebuild, runTaskCmd, "Rebuild all source for the project", [ MTBTasks.taskNameRebuild + " "  + projinfo.name]) ;
                        app.addChild(item) ;
                    }

                    if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameClean + " " + projinfo.name)) {
                        item = new MTBAssistItem(MTBTasks.taskNameClean) ;
                        item.command = new MTBAssistCommand(MTBTasks.taskNameClean, runTaskCmd, "Delete all build artifacts for the project", [ MTBTasks.taskNameClean + " " + projinfo.name]) ;
                        app.addChild(item) ;
                    }

                    if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameBuildProgram + " " + projinfo.name)) {
                        item = new MTBAssistItem(MTBTasks.taskNameBuildProgram) ;
                        item.command = new MTBAssistCommand(MTBTasks.taskNameBuildProgram, runTaskCmd, "Build the program and program into device memory", [ MTBTasks.taskNameBuildProgram + " " + projinfo.name]) ;
                        app.addChild(item) ;
                    }

                    if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameProgram + " " + projinfo.name)) {
                        item = new MTBAssistItem(MTBTasks.taskNameProgram) ;
                        item.command = new MTBAssistCommand(MTBTasks.taskNameProgram, runTaskCmd, "Program the program into device memory", [ MTBTasks.taskNameProgram + " " + projinfo.name]) ;
                        app.addChild(item) ;
                    }
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
