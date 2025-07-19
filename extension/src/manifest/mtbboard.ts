///
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
import { MessageType, MTBExtensionInfo } from '../mtbextinfo';
import { MTBItem } from './mtbitem';
import { MTBItemVersion } from './mtbitemversion';

export class MTBBoard extends MTBItem {
    public readonly category: string;
    public readonly description: string;
    public readonly summary: string;
    public readonly boardUri: vscode.Uri;
    public readonly documentationUri: vscode.Uri;
    public readonly provides: string[];
    public readonly chips: Map<string, string>;

    //id, name, category, desc, summary, boardUri, documentationUri, provs, chips, versions) ;

    constructor(src: vscode.Uri, id: string, name: string, category: string, desc: string, 
                    summary: string, boardUri: vscode.Uri,docUri: vscode.Uri, provs: string[], 
                    chips: Map<string, string>, versions: MTBItemVersion[]) {
        super(src, id, name, versions) ;
        this.category = category;
        this.description = desc;
        this.summary = summary;
        this.boardUri = boardUri;
        this.documentationUri = docUri;
        this.chips = chips;

        this.provides = [...provs] ;
        this.provides.sort() ;
    }

    public chipString() : string {
        let ret: string = "" ;

        for (let [key, value] of this.chips) {
            if (ret.length > 0) {
                ret += ", " ;
            }
            ret += key + "=" + value ;
        }

        return ret ;
    }

    static compareChips(c1: Map<string, string>, c2: Map<string, string>) : boolean {
        if (c1.size !== c2.size) {
            return false ;
        }

        let c1keys: string[] = Array.from(c1.keys()) ;
        let c2keys: string[] = Array.from(c2.keys()) ;
        if (!this.compareStringArrays(c1keys, c2keys)) {
            return false ;
        }

        for(var key of c1keys) {
            if (c1.get(key) !== c2.get(key)) {
                return false ;
            }
        }

        return true ;
    }

    static merge(board1: MTBBoard, board2: MTBBoard): MTBBoard | undefined {
        let ret: MTBBoard | undefined = board1 ;

        if (board1.name !== board1.name) {
            MTBItem.mergeMsg(board1.id, "board", "name", board1.name, board1.name, board1.source, board2.source) ;
        }

        if (board1.category !== board2.category) {
            MTBItem.mergeMsg(board1.id, "board", "category", board1.category.toString(), board2.category.toString(), board1.source, board2.source) ;
        }

        if (board1.summary !== board2.summary) {
            MTBItem.mergeMsg(board1.id, "board", "summary", board1.summary.toString(), board2.summary.toString(), board1.source, board2.source) ;
        }

        if (board1.boardUri !== board2.boardUri) {
            MTBItem.mergeMsg(board1.id, "board", "boardUri", board1.boardUri.toString(), board2.boardUri.toString(), board1.source, board2.source) ;
        }

        if (board1.documentationUri !== board2.documentationUri) {
            MTBItem.mergeMsg(board1.id, "board", "documentationUri", board1.documentationUri.toString(), board2.documentationUri.toString(), board1.source, board2.source) ;
        }

        if (!this.compareStringArrays(board1.provides, board2.provides)) {
            MTBItem.mergeMsg(board1.id, "board", "requirements", board1.provides.join(','), board2.provides.join(','), board1.source, board2.source) ;
        }

        if (!this.compareChips(board1.chips, board2.chips)) {
            MTBItem.mergeMsg(board1.id, "board", "chips", board1.chipString(), board2.chipString(), board1.source, board2.source) ;
        }

        for(let ver of board2.versions) {
            if (board1.containsVersion(ver.num)) {
                let ext: MTBExtensionInfo = MTBExtensionInfo.getMtbExtensionInfo() ;
                //
                // We cannot have the same version name in both.  Report an error
                // and skip this element.
                //
                ext.logMessage(MessageType.error, "two instances of 'board' contains the same version '" + ver.num + "'") ;
                ret = undefined ;
            }
        }

        return ret;
    }
}
