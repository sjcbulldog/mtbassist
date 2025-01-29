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
import path = require("path") ;
import { MTBAssistCommand } from '../mtbassistcmd';
import { MTBExtensionInfo } from '../mtbextinfo';
import { MTBAssistItem } from '../mtbitem' ;
import { MTBLaunchDoc, MTBLaunchInfo } from '../mtblaunchdata';

export class MTBAssistDocumentProvider implements vscode.TreeDataProvider<MTBAssistItem> {
    private hasMTB_ : boolean = false ;
    private items_ : MTBAssistItem[] = [] ;
    private onDidChangeTreeData_: vscode.EventEmitter<MTBAssistItem | undefined | null | void> = new vscode.EventEmitter<MTBAssistItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MTBAssistItem | undefined | null | void> = this.onDidChangeTreeData_.event;

    constructor() {
        this.refresh(undefined) ;
    }

    public setHasMTB(hasMTB: boolean) {
        this.hasMTB_ = hasMTB ;
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

    private convertTradeMark(title: string) : string {
        return title.replace("&trade;", "\u2122") ;
    }

    private findChild(projname: string) : MTBAssistItem | undefined {
        for(let item of this.items_) {
            if (item.label === projname) {
                return item ;
            }
        }

        return undefined ;
    }
    
    refresh(docs?: MTBLaunchDoc[]) {
        if (this.hasMTB_) {
            this.refreshWithMTB(docs) ;
        }
        else {
            this.refreshWithOutMTB(docs) ;
        }
    }

    private refreshWithOutMTB(docs?: MTBLaunchDoc[]) {
        let url = "https://softwaretools.infineon.com/tools/com.ifx.tb.tool.modustoolboxsetup";

        let item: MTBAssistItem ;
        item = new MTBAssistItem("Download ModusToolbox Setup Tool") ;
        item.command = new MTBAssistCommand("ModusToolbox Setup Tool", "mtbassist.mtbShowDoc", "Download the ModusToolbox Setup Tool") ;
        item.command.arguments = [] ;
        let train: MTBLaunchDoc = new MTBLaunchDoc() ;

        train.location = url ;
        item.command.arguments.push(train) ;
        this.items_.push(item) ;          
    }

    private refreshWithMTB(docs?: MTBLaunchDoc[]) {
        this.items_ = [] ;

        let parent: MTBAssistItem ;
        let item: MTBAssistItem ;

        item = new MTBAssistItem("ModusToolbox Landing Page") ;
        item.command = new MTBAssistCommand("ModusToolbox Landing Page", "mtbassist.mtbShowDoc", "Open the 'ModusToolbox Landing Page' document") ;
        item.command.arguments = [] ;
        let land: MTBLaunchDoc = new MTBLaunchDoc() ;

        let landpath:string = path.join(MTBExtensionInfo.getMtbExtensionInfo().docsDir, "doc_landing.html") ;
        land.location = landpath ;
        item.command.arguments.push(land) ;
        this.items_.push(item) ;

        item = new MTBAssistItem("ModusToolbox Training Materials") ;
        item.command = new MTBAssistCommand("ModusToolbox Training Materials", "mtbassist.mtbShowDoc", "Open the 'ModusToolbox Training Materials Page' document") ;
        item.command.arguments = [] ;
        let train: MTBLaunchDoc = new MTBLaunchDoc() ;

        let trainpath:string = "https://github.com/Infineon/training-modustoolbox" ;
        train.location = trainpath ;
        item.command.arguments.push(train) ;
        this.items_.push(item) ;        

        if (docs) {
            docs.forEach((doc) => {
                let parent: MTBAssistItem | undefined = undefined ;

                if (doc.project.length > 0) {
                    parent = this.findChild(doc.project) ;
                    if (parent === undefined) {
                        parent = new MTBAssistItem(doc.project) ;
                        this.items_.push(parent) ;
                    }
                }

                let title: string = this.convertTradeMark(doc.title) ;
                let item : MTBAssistItem = new MTBAssistItem(title) ;
                item.doc = doc ;
                
                item.command = new MTBAssistCommand(doc.title, "mtbassist.mtbShowDoc", "Open the '" + doc.title + "' document") ;
                item.command.arguments = [] ;
                item.command.arguments.push(doc) ;

                if (parent !== undefined) {
                    parent.addChild(item) ;
                }
                else {
                    this.items_.push(item) ;
                }

            }) ;
        }
        this.onDidChangeTreeData_.fire();
    }
}

let docs : MTBAssistDocumentProvider | undefined ;

export function getMTBDocumentationTreeProvider() : MTBAssistDocumentProvider {
    if (docs === undefined) {
        docs = new MTBAssistDocumentProvider() ;
        docs.setHasMTB(true) ;
    }
    return docs ;
}

export function getNoMTBDocumentationTreeProvider() : MTBAssistDocumentProvider {
    if (docs === undefined) {
        docs = new MTBAssistDocumentProvider() ;
        docs.setHasMTB(false) ;
    }
    return docs ;
}
