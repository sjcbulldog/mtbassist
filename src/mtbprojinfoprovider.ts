import * as vscode from 'vscode';
import { theModusToolboxApp } from './mtbappinfo';
import { ModusToolboxEnvVarNames } from './mtbnames';

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