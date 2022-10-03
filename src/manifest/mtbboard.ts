///
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
import { MTBItemVersion } from './mtbitemversion';

export class MTBBoard {
    public readonly source: vscode.Uri ;
    public readonly id: string;
    public readonly name: string;
    public readonly category: string;
    public readonly description: string;
    public readonly summary: string;
    public readonly boardUri: vscode.Uri;
    public readonly documentationUri: vscode.Uri;
    public readonly provides: string[];
    public readonly chips: Map<string, string>;
    public readonly versions: MTBItemVersion[];

    //id, name, category, desc, summary, boardUri, documentationUri, provs, chips, versions) ;

    constructor(src: vscode.Uri, id: string, name: string, category: string, desc: string, 
                    summary: string, boardUri: vscode.Uri,docUri: vscode.Uri, provs: string[], 
                    chips: Map<string, string>, versions: MTBItemVersion[]) {
        this.source = src ;
        this.id = id;
        this.name = name;
        this.category = category;
        this.description = desc;
        this.summary = summary;
        this.boardUri = boardUri;
        this.documentationUri = docUri;
        this.provides = [...provs] ;
        this.chips = chips;
        this.versions = versions;

        this.provides.sort() ;
    }

    public containsVersion(num: string) : boolean {
        for(let ver of this.versions) {
            if (ver.num === num) {
                return true ;
            }
        }
        
        return false ;
    }    
}
