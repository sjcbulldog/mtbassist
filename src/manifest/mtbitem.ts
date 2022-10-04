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
import { MessageType, MTBExtensionInfo } from "../mtbextinfo";
import { MTBItemVersion } from "./mtbitemversion";

export class MTBItem
{
    public readonly name: string;
    public readonly source: vscode.Uri ;
    public readonly id: string;
    public readonly versions: MTBItemVersion[];

    constructor(src: vscode.Uri, id: string, name: string, versions: MTBItemVersion[]) {
        this.name = name ;
        this.source = src ;
        this.id = id ;
        this.versions = versions ;
    }

    public containsVersion(num: string) : boolean {
        for(let ver of this.versions) {
            if (ver.num === num) {
                return true ;
            }
        }
        
        return false ;
    }
    
    protected static compareStringArrays(a1: string[], a2: string[]) : boolean {
        if (a1.length !== a2.length) {
            return false ;
        }

        for(let index: number = 0 ; index < a1.length ; index++) {
            if (a1[index] !== a2[index]) {
                return false ;
            }
        }

        return true ;
    }

    protected static mergeMsg(id: string, typestr: string, field: string, f1: string, f2:string, src1: vscode.Uri, src2: vscode.Uri) {
        let ext: MTBExtensionInfo = MTBExtensionInfo.getMtbExtensionInfo() ;
        let msg: string = "two instances of '" + typestr + "' - '" + id + "' were merged with differing '" + field + "' fields" ;
        ext.logMessage(MessageType.warning, msg) ;
        msg = "    the first instance was from '" + src1.toString() + "'" ;
        ext.logMessage(MessageType.warning, msg) ;
        msg = "    the second instance was from '" + src2.toString() + "'" ;
        ext.logMessage(MessageType.warning, msg) ;
        msg = "    the first '" + field + "' value was '" + f1 + "'" ;
        ext.logMessage(MessageType.warning, msg) ;
        msg = "    the second '" + field + "' value was '" + f2 + "'" ;
        ext.logMessage(MessageType.warning, msg) ;
    }
}