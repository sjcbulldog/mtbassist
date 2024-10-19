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
import { MTBAssistItem } from '../mtbitem' ;
import { MTBAssistCommand } from '../mtbassistcmd';
import { AppType, MTBAppInfo, getModusToolboxApp } from '../mtbapp/mtbappinfo';
import { MTBTasks } from '../mtbapp/mtbtasks';

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
                item.command = new MTBAssistCommand(MTBTasks.taskNameBuild, runTaskCmd, MTBTasks.taskNameBuild, [ MTBTasks.taskNameBuild ]) ;
                this.items_.push(item) ;
            }

            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameBuildNinja)) {
                item = new MTBAssistItem(MTBTasks.taskNameBuildNinja) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameBuildNinja, runTaskCmd, MTBTasks.taskNameBuildNinja, [ MTBTasks.taskNameBuildNinja ]) ;
                this.items_.push(item) ;
            }

            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameRebuild)) {
                item = new MTBAssistItem(MTBTasks.taskNameRebuild) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameRebuild, runTaskCmd, MTBTasks.taskNameRebuild, [ MTBTasks.taskNameRebuild]) ;
                this.items_.push(item) ;
            }

            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameRebuildNinja)) {
                item = new MTBAssistItem(MTBTasks.taskNameRebuildNinja) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameRebuildNinja, runTaskCmd, MTBTasks.taskNameRebuildNinja, [ MTBTasks.taskNameRebuildNinja]) ;
                this.items_.push(item) ;
            }            

            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameClean)) {
                item = new MTBAssistItem(MTBTasks.taskNameClean) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameClean, runTaskCmd, MTBTasks.taskNameClean, [ MTBTasks.taskNameClean]) ;
                this.items_.push(item) ;
            }

            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameBuildProgram)) {
                item = new MTBAssistItem(MTBTasks.taskNameBuildProgram) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameBuildProgram, runTaskCmd, MTBTasks.taskNameBuildProgram, [ MTBTasks.taskNameBuildProgram]) ;
                this.items_.push(item) ;
            }

            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameBuildProgramNinja)) {
                item = new MTBAssistItem(MTBTasks.taskNameBuildProgramNinja) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameBuildProgramNinja, runTaskCmd, MTBTasks.taskNameBuildProgramNinja, [ MTBTasks.taskNameBuildProgramNinja]) ;
                this.items_.push(item) ;
            }

            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameQuickProgram)) {
                item = new MTBAssistItem(MTBTasks.taskNameQuickProgram) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameQuickProgram, runTaskCmd, MTBTasks.taskNameQuickProgram, [ MTBTasks.taskNameQuickProgram]) ;
                this.items_.push(item) ;
            }            

            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameErase)) {
                item = new MTBAssistItem(MTBTasks.taskNameErase) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameErase, runTaskCmd, MTBTasks.taskNameErase, [ MTBTasks.taskNameErase]) ;
                this.items_.push(item) ;
            }
        }
        else {
            //
            // First lets take care of the application level items
            //
            let app: MTBAssistItem = new MTBAssistItem("Application") ;
            this.items_.push(app) ;             

            let name = appinfo.tasks.createTaskName(MTBTasks.taskNameBuild) ;
            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameBuild)) {
                item = new MTBAssistItem(MTBTasks.taskNameBuild) ;
                item.command = new MTBAssistCommand(name, runTaskCmd,name, [ name]) ;
                app.addChild(item) ;
            }            

            name = appinfo.tasks.createTaskName(MTBTasks.taskNameBuildNinja) ;
            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameBuildNinja)) {
                item = new MTBAssistItem(MTBTasks.taskNameBuildNinja) ;
                item.command = new MTBAssistCommand(name, runTaskCmd, name, [ name]) ;
                app.addChild(item) ;
            }   
            
            name = appinfo.tasks.createTaskName(MTBTasks.taskNameRebuild) ;
            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameRebuild)) {
                item = new MTBAssistItem(MTBTasks.taskNameRebuild) ;
                item.command = new MTBAssistCommand(name, runTaskCmd, name, [ name]) ;
                app.addChild(item) ;
            }            

            name = appinfo.tasks.createTaskName(MTBTasks.taskNameRebuildNinja) ;
            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameRebuildNinja)) {
                item = new MTBAssistItem(MTBTasks.taskNameRebuildNinja) ;
                item.command = new MTBAssistCommand(name, runTaskCmd, name, [ name]) ;
                app.addChild(item) ;
            }            

            name = appinfo.tasks.createTaskName(MTBTasks.taskNameClean) ;
            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameClean)) {
                item = new MTBAssistItem(MTBTasks.taskNameClean) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameClean, runTaskCmd, name, [ name ]) ;
                app.addChild(item) ;
            }

            name = appinfo.tasks.createTaskName(MTBTasks.taskNameBuildProgram) ;            
            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameBuildProgram)) {
                item = new MTBAssistItem(MTBTasks.taskNameBuildProgram) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameBuildProgram, runTaskCmd, name, [ name ]) ;
                app.addChild(item) ;
            }

            name = appinfo.tasks.createTaskName(MTBTasks.taskNameBuildProgramNinja) ;            
            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameBuildProgramNinja)) {
                item = new MTBAssistItem(MTBTasks.taskNameBuildProgramNinja) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameBuildProgramNinja, runTaskCmd, name, [ name ]) ;
                app.addChild(item) ;
            }            

            name = appinfo.tasks.createTaskName(MTBTasks.taskNameQuickProgram) ;             
            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameQuickProgram)) {
                item = new MTBAssistItem(MTBTasks.taskNameQuickProgram) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameQuickProgram, runTaskCmd, name, [ name ]) ;
                app.addChild(item) ;
            }                

            name = appinfo.tasks.createTaskName(MTBTasks.taskNameErase) ;               
            if (appinfo.tasks.doesTaskExist(MTBTasks.taskNameErase)) {
                item = new MTBAssistItem(MTBTasks.taskNameErase) ;
                item.command = new MTBAssistCommand(MTBTasks.taskNameErase, runTaskCmd, name, [ name ]) ;
                app.addChild(item) ;
            }                 

            //
            // Now, lets process each project
            //
            for(let projinfo of appinfo.projects) {
                let name: string ;
                let app: MTBAssistItem = new MTBAssistItem(projinfo.name) ;
                this.items_.push(app) ;

                name = appinfo.tasks.createTaskName(MTBTasks.taskNameBuild, projinfo.name) ;
                if (appinfo.tasks.doesTaskExist(name)) { 
                    item = new MTBAssistItem(MTBTasks.taskNameBuild) ;
                    item.command = new MTBAssistCommand(MTBTasks.taskNameBuild, runTaskCmd, name, [ name ]) ;
                    app.addChild(item) ;
                }

                name = appinfo.tasks.createTaskName(MTBTasks.taskNameBuildNinja, projinfo.name) ;
                if (appinfo.tasks.doesTaskExist(name)) { 
                    item = new MTBAssistItem(MTBTasks.taskNameBuildNinja) ;
                    item.command = new MTBAssistCommand(MTBTasks.taskNameBuildNinja, runTaskCmd, name, [ name ]) ;
                    app.addChild(item) ;
                }

                name = appinfo.tasks.createTaskName(MTBTasks.taskNameRebuild, projinfo.name) ;
                if (appinfo.tasks.doesTaskExist(name)) { 
                    item = new MTBAssistItem(MTBTasks.taskNameRebuild) ;
                    item.command = new MTBAssistCommand(MTBTasks.taskNameRebuild, runTaskCmd, name, [ name ]) ;
                    app.addChild(item) ;
                }  

                name = appinfo.tasks.createTaskName(MTBTasks.taskNameRebuildNinja, projinfo.name) ;
                if (appinfo.tasks.doesTaskExist(name)) { 
                    item = new MTBAssistItem(MTBTasks.taskNameRebuildNinja) ;
                    item.command = new MTBAssistCommand(MTBTasks.taskNameRebuildNinja, runTaskCmd, name, [ name ]) ;
                    app.addChild(item) ;
                }  

                name = appinfo.tasks.createTaskName(MTBTasks.taskNameClean, projinfo.name) ;
                if (appinfo.tasks.doesTaskExist(name)) { 
                    item = new MTBAssistItem(MTBTasks.taskNameClean) ;
                    item.command = new MTBAssistCommand(MTBTasks.taskNameClean, runTaskCmd, name, [ name ]) ;
                    app.addChild(item) ;
                }  

                name = appinfo.tasks.createTaskName(MTBTasks.taskNameBuildProgram, projinfo.name) ;
                if (appinfo.tasks.doesTaskExist(name)) {
                    item = new MTBAssistItem(MTBTasks.taskNameBuildProgram) ;
                    item.command = new MTBAssistCommand(MTBTasks.taskNameBuildProgram, runTaskCmd, name, [ name]) ;
                    app.addChild(item) ;
                }

                name = appinfo.tasks.createTaskName(MTBTasks.taskNameBuildProgramNinja, projinfo.name) ;
                if (appinfo.tasks.doesTaskExist(name)) {
                    item = new MTBAssistItem(MTBTasks.taskNameBuildProgramNinja) ;
                    item.command = new MTBAssistCommand(MTBTasks.taskNameBuildProgramNinja, runTaskCmd, name, [ name]) ;
                    app.addChild(item) ;
                }                

                name = appinfo.tasks.createTaskName(MTBTasks.taskNameQuickProgram, projinfo.name) ;                
                if (appinfo.tasks.doesTaskExist(name)) {
                    item = new MTBAssistItem(MTBTasks.taskNameQuickProgram) ;
                    item.command = new MTBAssistCommand(MTBTasks.taskNameQuickProgram, runTaskCmd, name, [ name]) ;
                    app.addChild(item) ;
                }

                // remove the header if there are no children
                if (app.getChildren().length == 0) {
                    this.items_.pop();
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
