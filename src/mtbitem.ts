import * as vscode from 'vscode';
import { MTBLaunchConfig, MTBLaunchDoc } from './mtblaunchdata';

export class MTBAssistItem extends vscode.TreeItem {
    public config?: MTBLaunchConfig ;
    public doc?: MTBLaunchDoc ;

    private children: MTBAssistItem[] ;

    constructor(l: string) {
        super(l, vscode.TreeItemCollapsibleState.None) ;

        this.config = undefined ;
        this.doc = undefined ;
        this.children = [] ;
    }

    setChildren(c: MTBAssistItem[]) {
        this.children = c ;
        if (this.children.length > 0) {
            this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded ;
        } 
        else {
            this.collapsibleState = vscode.TreeItemCollapsibleState.None ;
        }
    }

    getChildren() : MTBAssistItem[] {
        return this.children ;
    }

    addChild(child: MTBAssistItem) {
        this.children.push(child) ;
        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded ;
    }
}
