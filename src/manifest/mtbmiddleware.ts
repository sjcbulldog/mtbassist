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
import { MessageType, MTBExtensionInfo } from '../mtbextinfo';
import { MTBItem } from './mtbitem';
import { MTBItemVersion } from './mtbitemversion';

export class MTBMiddleware extends MTBItem {
    public readonly uri: vscode.Uri;
    public readonly description: string;
    public readonly category: string;
    public readonly requirements: string[];

    constructor(src: vscode.Uri, id: string, name: string, uri: vscode.Uri, desc: string, cat: string,
                    reqs: string[], versions: MTBItemVersion[]) {
        super(src, id, name, versions) ;

        this.uri = uri;
        this.description = desc;
        this.category = cat;
        this.requirements = [...reqs] ;
        this.requirements.sort() ;
    }
    
    static merge(middleware1: MTBMiddleware, middleware2: MTBMiddleware): MTBMiddleware | undefined {
        let ret: MTBMiddleware | undefined = middleware1 ;

        if (middleware1.name !== middleware2.name) {
            MTBItem.mergeMsg(middleware1.id, "middleware", "name", middleware1.name, middleware2.name, middleware1.source, middleware2.source) ;
        }

        if (middleware1.uri !== middleware2.uri) {
            MTBItem.mergeMsg(middleware1.id, "middleware", "uri", middleware1.uri.toString(), middleware2.uri.toString(), middleware1.source, middleware2.source) ;
        }

        if (middleware1.description !== middleware2.description) {
            MTBItem.mergeMsg(middleware1.id, "middleware", "description", middleware1.description, middleware2.description, middleware1.source, middleware2.source) ;
        }

        if (middleware1.category !== middleware2.category) {
            MTBItem.mergeMsg(middleware1.id, "middleware", "category", middleware1.category, middleware2.category, middleware1.source, middleware2.source) ;
        }        

        if (!this.compareStringArrays(middleware1.requirements, middleware2.requirements)) {
            MTBItem.mergeMsg(middleware1.id, "middleware", "requirements", middleware1.requirements.join(','), middleware2.requirements.join(','), middleware1.source, middleware2.source) ;
        }

        for(let ver of middleware2.versions) {
            if (middleware1.containsVersion(ver.num)) {
                let ext: MTBExtensionInfo = MTBExtensionInfo.getMtbExtensionInfo() ;
                //
                // We cannot have the same version name in both.  Report an error
                // and skip this element.
                //
                ext.logMessage(MessageType.error, "two instances of 'middleware' contains the same version '" + ver.num + "'") ;
                ret = undefined ;
            }
        }

        return ret;
    }
}
