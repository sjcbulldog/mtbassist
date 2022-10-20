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
import path = require("path") ;
import { MTBAssistCommand } from './mtbassistcmd';
import { MTBExtensionInfo } from './mtbextinfo';
import { MTBAssistItem } from './mtbitem' ;
import { MTBLaunchDoc, MTBLaunchInfo } from './mtblaunchdata';

export class MTBAssistDocumentProvider implements vscode.TreeDataProvider<MTBAssistItem> {
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

    private findItem(items: MTBAssistItem[], text: string) : number {
        return -1 ;
    }

    private convertTradeMark(title: string) : string {
        return title.replace("&trade;", "\u2122") ;
    }

    refresh(docs?: MTBLaunchDoc[]) {
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

        if (docs) {
            item = new MTBAssistItem("Application") ;
            this.items_.push(item) ;

            docs.forEach((doc) => {
                let title: string = this.convertTradeMark(doc.title) ;
                let item : MTBAssistItem = new MTBAssistItem(title) ;
                item.doc = doc ;
                
                item.command = new MTBAssistCommand(doc.title, "mtbassist.mtbShowDoc", "Open the '" + doc.title + "' document") ;
                item.command.arguments = [] ;
                item.command.arguments.push(doc) ;

                if (doc.path.length === 0) {
                    this.items_[1].addChild(item) ;
                }
                else {
                    let index: number = 0 ;

                    while (index < doc.path.length) {
                        let offset : number ;

                        if (index === 0) {
                            offset = this.findItem(this.items_, doc.path[index]) ;
                        }
                        else {
                            offset = this.findItem(parent.getChildren(), doc.path[index]) ;
                        }

                        if (offset === -1) {
                            let newone:MTBAssistItem = new MTBAssistItem(doc.path[index]) ;
                            if (index === 0) {
                                this.items_.push(newone) ;
                            }
                            else {
                                parent.addChild(newone) ;
                            }
                            index++ ;
                            parent = newone ;
                        }
                    }

                    parent.addChild(item) ;
                }
            }) ;
        }
        else {
            item = new MTBAssistItem("Load application for more ...") ;
            this.items_.push(item) ;
        }
        this.onDidChangeTreeData_.fire();
    }
}

let docs : MTBAssistDocumentProvider | undefined ;

export function getMTBDocumentationTreeProvider() : MTBAssistDocumentProvider {
    if (docs === undefined) {
        docs = new MTBAssistDocumentProvider() ;
    }
    return docs ;
}
