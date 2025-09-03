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

import { URI } from 'vscode-uri';
import { MTBItem } from './mtbitem';
import { MTBItemVersion } from './mtbitemversion';
import * as winston from 'winston';
import { PackManifest } from '../packdb/packdb';

export class MTBMiddleware extends MTBItem {
    public readonly uri: URI;
    public readonly description: string;
    public readonly category: string;
    public readonly requirements: string[];

    constructor(src: PackManifest, id: string, name: string, uri: URI, desc: string, cat: string,
                    reqs: string[], versions: MTBItemVersion[]) {
        super(src, id, name, versions) ;

        this.uri = uri;
        this.description = desc;
        this.category = cat;
        this.requirements = [...reqs] ;
        this.requirements.sort() ;
    }
    
    static merge(logger: winston.Logger, middleware1: MTBMiddleware, middleware2: MTBMiddleware): MTBMiddleware | undefined {
        let ret: MTBMiddleware | undefined = middleware1 ;

        if (middleware1.name !== middleware2.name) {
            MTBItem.mergeMsg(logger, middleware1.id, "middleware", "name", middleware1.name, middleware2.name, middleware1.source.uripath, middleware2.source.uripath) ;
        }

        if (middleware1.uri !== middleware2.uri) {
            MTBItem.mergeMsg(logger, middleware1.id, "middleware", "uri", middleware1.uri.toString(), middleware2.uri.toString(), middleware1.source.uripath, middleware2.source.uripath) ;
        }

        if (middleware1.description !== middleware2.description) {
            MTBItem.mergeMsg(logger, middleware1.id, "middleware", "description", middleware1.description, middleware2.description, middleware1.source.uripath, middleware2.source.uripath) ;
        }

        if (middleware1.category !== middleware2.category) {
            MTBItem.mergeMsg(logger, middleware1.id, "middleware", "category", middleware1.category, middleware2.category, middleware1.source.uripath, middleware2.source.uripath) ;
        }

        if (!this.compareStringArrays(middleware1.requirements, middleware2.requirements)) {
            MTBItem.mergeMsg(logger, middleware1.id, "middleware", "requirements", middleware1.requirements.join(','), middleware2.requirements.join(','), middleware1.source.uripath, middleware2.source.uripath) ;
        }

        for(let ver of middleware2.versions) {
            if (middleware1.containsVersion(ver.num)) {
                //
                // We cannot have the same version name in both.  Report an error
                // and skip this element.
                //
                logger.error("two instances of 'middleware' contains the same version '" + ver.num + "'") ;
                ret = undefined ;
                break ;
            }
            ret.versions.push(ver) ;
        }

        return ret;
    }
}
