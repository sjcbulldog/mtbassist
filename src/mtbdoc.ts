import * as vscode from 'vscode';
import path = require("path") ;
import { MTBAssistCommand } from './mtbglobal';
import { MTBInfo } from './mtbinfo';
import { MTBAssistItem } from './mtbitem' ;
import { MTBLaunchDoc } from './mtblaunchdata';

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

    refresh(info?: MTBInfo) {
        this.items_ = [] ;

        let parent: MTBAssistItem ;
        let item: MTBAssistItem ;

        if (info) {
            item = new MTBAssistItem("ModusToolbox Landing Page") ;
            item.command = new MTBAssistCommand("ModusToolbox Landing Page", "mtbassist.mtbShowDoc", "Open the 'ModusToolbox Landing Page' document") ;
            item.command.arguments = [] ;
            let land: MTBLaunchDoc = new MTBLaunchDoc() ;
            let landpath: string = info!.toolsDir.replace("tools_", "docs_") ;
            landpath = path.join(landpath, "doc_landing.html") ;
            land.location = landpath ;
            item.command.arguments.push(land) ;
            this.items_.push(item) ;

            item = new MTBAssistItem("Global") ;
            this.items_.push(item) ;

            if (info !== undefined) {
                info.launch.docs.forEach((doc) => {
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
        }
        else {
            item = new MTBAssistItem("Load application for more ...") ;
            this.items_.push(item) ;
        }
        this.onDidChangeTreeData_.fire();
    }
}
