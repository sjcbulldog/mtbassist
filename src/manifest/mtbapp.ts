///
// Copyright 2022 by C And T Software
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

//
// This class represents a single application or code example that is available and defined
//

export class MTBApp extends MTBItem {
    public readonly uri: vscode.Uri;
    public readonly description: string;
    public readonly requirements: string[];


    constructor(src: vscode.Uri, name: string, id: string, uri: vscode.Uri, description: string,
        requirements: string[], versions: MTBItemVersion[]) 
    {
        super(src, id, name, versions) ;

        this.uri = uri;
        this.description = description;
        this.requirements = [...requirements];
        this.requirements.sort() ;
    }

    static merge(app1: MTBApp, app2: MTBApp): MTBApp | undefined {
        let ret: MTBApp | undefined = app1 ;

        if (app1.name !== app2.name) {
            MTBItem.mergeMsg(app1.id, "app", "name", app1.name, app2.name, app1.source, app2.source) ;
        }

        if (app1.uri !== app2.uri) {
            MTBItem.mergeMsg(app1.id, "app", "uri", app1.uri.toString(), app2.uri.toString(), app1.source, app2.source) ;
        }

        if (app1.description !== app2.description) {
            MTBItem.mergeMsg(app1.id, "app", "description", app1.description, app2.description, app1.source, app2.source) ;
        }

        if (!this.compareStringArrays(app1.requirements, app2.requirements)) {
            MTBItem.mergeMsg(app1.id, "app", "requirements", app1.requirements.join(','), app2.requirements.join(','), app1.source, app2.source) ;
        }

        for(let ver of app2.versions) {
            if (app1.containsVersion(ver.num)) {
                let ext: MTBExtensionInfo = MTBExtensionInfo.getMtbExtensionInfo() ;
                //
                // We cannot have the same version name in both.  Report an error
                // and skip this element.
                //
                ext.logMessage(MessageType.error, "two instances of 'app' contains the same version '" + ver.num + "'") ;
                ret = undefined ;
            }
        }

        return ret;
    }
}