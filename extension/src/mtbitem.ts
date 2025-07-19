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
