//
// Copyright 2022 by C And T Software
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
import { MTBAssistCommand } from './mtbassistcmd';
import { MessageType, MTBExtensionInfo } from './mtbextinfo';
import { MTBAssistItem } from './mtbitem' ;
import { MTBLaunchConfig } from './mtblaunchdata';

export class MTBProgramProvider implements vscode.TreeDataProvider<MTBAssistItem> {
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
        let projmap: Map<string, MTBAssistItem> = new Map<string, MTBAssistItem>() ;
        this.items_ = [] ;

        let item: MTBAssistItem = new MTBAssistItem("Global") ;
        this.items_.push(item) ;

        item = new MTBAssistItem("Application") ;
        this.items_.push(item) ;

        item = new MTBAssistItem("BSP") ;
        this.items_.push(item) ;

        item = new MTBAssistItem("Create Project") ;
        item.command = new MTBAssistCommand("Create Project", "mtbassist.mtbCreateProject", "Create Project") ;
        this.items_[0].addChild(item) ;

        item = new MTBAssistItem("Show Welcome Page") ;
        item.command = new MTBAssistCommand("Import Project", "mtbassist.mtbShowWelcomePage", "Show Welcome Page") ;
        this.items_[0].addChild(item) ;

        item = new MTBAssistItem("Decode cy_rslt_t code") ;
        item.command = new MTBAssistCommand("Decode cy_rslt_t code", "mtbassist.mtbResultDecode", "Decode Result Code") ;
        this.items_[0].addChild(item) ;        

        if (configs !== undefined) {      

            item = new MTBAssistItem("Run 'make getlibs'") ;
            item.command = new MTBAssistCommand("Run Make Getlibs", "mtbassist.mtbRunMakeGetlibs", "Run 'make getlibs'") ;
            this.items_[1].addChild(item) ;

            let projects : string[] = this.findProjects(configs) ;
            for(let project of projects) {
                item = new MTBAssistItem("Project: " + project) ;
                projmap.set(project, item) ;
                this.items_.push(item) ;
            }

            for(let config of configs) {
                item = new MTBAssistItem(config.displayName) ;
                item.command = new MTBAssistCommand(config.displayName, "mtbassist.mtbRunEditor", "Run the '" + config.displayName + "' program") ;
                item.command.arguments = [] ;
                item.command.arguments.push(config) ;
                item.config = config ;

                if (config.scope === "global") {
                    if (config.shortName !== "project-creator") {
                        //
                        // We treat project creator special and put it into the true global section
                        // and not the application section
                        //
                        this.items_[1].addChild(item) ;
                    }
                } else if (config.scope === "bsp") {
                    this.items_[2].addChild(item) ;
                } else if (config.scope === "project") {
                    projmap.get(config.project)?.addChild(item) ;
                }
            }
        }

        if (this.items_[2].getChildren().length === 0) {
            this.items_.splice(2, 1) ;
        }

        if (this.items_[1].getChildren().length === 0) {
            this.items_.splice(1, 1) ;
        }

        this.onDidChangeTreeData_.fire();
    }

    private findProjects(configs: MTBLaunchConfig[]) : string[] {
        let ret : string[] = [] ;

        configs.forEach(function(config) {
            if (config.scope === "project" && !ret.includes(config.project)) {
                ret.push(config.project) ;
            }
        }) ;

        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "projects: " + ret.toString()) ;

        return ret;
    }
}

let pgms : MTBProgramProvider | undefined ;

export function getMTBProgramsTreeProvider() : MTBProgramProvider {
    if (pgms === undefined) {
        pgms = new MTBProgramProvider() ;
    }
    
    return pgms ;
}
