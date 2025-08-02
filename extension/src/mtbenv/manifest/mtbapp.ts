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

import * as winston from 'winston';
import { MTBItem } from './mtbitem';
import { MTBItemVersion } from './mtbitemversion';
import { URI } from 'vscode-uri' ;

//
// This class represents a single application or code example that is available and defined
//

export class MTBApp extends MTBItem {
    public readonly description: string;
    public readonly requirements: string[];
    public readonly uri: URI;
    
    constructor(src: URI, name: string, id: string, uri: URI, description: string,
        requirements: string[], versions: MTBItemVersion[]) 
    {
        super(src, id, name, versions) ;

        this.uri = uri;
        this.description = description;
        this.requirements = [...requirements];
        this.requirements.sort() ;
    }

    static merge(logger: winston.Logger, app1: MTBApp, app2: MTBApp): MTBApp | undefined {
        let ret: MTBApp | undefined = app1 ;

        if (app1.name !== app2.name) {
            MTBItem.mergeMsg(logger, app1.id, "app", "name", app1.name, app2.name, app1.source, app2.source) ;
        }

        if (app1.uri !== app2.uri) {
            MTBItem.mergeMsg(logger, app1.id, "app", "uri", app1.uri.toString(), app2.uri.toString(), app1.source, app2.source) ;
        }

        if (app1.description !== app2.description) {
            MTBItem.mergeMsg(logger, app1.id, "app", "description", app1.description, app2.description, app1.source, app2.source) ;
        }

        if (!this.compareStringArrays(app1.requirements, app2.requirements)) {
            MTBItem.mergeMsg(logger, app1.id, "app", "requirements", app1.requirements.join(','), app2.requirements.join(','), app1.source, app2.source) ;
        }

        for(let ver of app2.versions) {
            if (app1.containsVersion(ver.num)) {
                if (app1.uri !== app2.uri) {
                    //
                    // We cannot have the same version name in both.  Report an error
                    // and skip this element.
                    //
                    logger.error("two instances of 'app' contains the same version '" + ver.num + "'") ;
                    ret = undefined ;
                }
            }
        }

        return ret;
    }
}