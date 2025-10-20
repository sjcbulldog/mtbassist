/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as winston from 'winston';
import { MTBUtils } from "../misc/mtbutils";
import { MTBToolSource, ToolsDB } from "../toolsdb/toolsdb";
import { PackDB } from "./packdb";
import * as fs from 'fs' ;
import * as path from 'path' ;

interface IDCEntryDependency {
    uuid: string ;
    targetFeatureId: string ;
    maxVersionNumeric: number ;
    minVersionNumeric: number ;
}

interface IDCEntry {
    additionalPaths? : string[] ;
    attributes? : any ;
    dependencies? : IDCEntryDependency[] ;
    description? : string ;
    exePath?: string ;
    featureId?: string ;
    guid?: string ;
    help?: string ;
    licenses?: string ;
    path?: string ;
    release?: string ;
    title?: string ;
    toolImage?: string ;
    type?: string ;
    uninstallPath?: string ;
    version: string ;
    versionNumeric: number ;
}

export class PackDBLoader {
    private packdb_ : PackDB ;
    private toolsdb_ : ToolsDB ;
    private logger_ : winston.Logger ;
    
    constructor(logger: winston.Logger, db: PackDB, tdb: ToolsDB) {
        this.packdb_ = db ;
        this.toolsdb_ = tdb ;
        this.logger_ = logger ;
    }

    public scanDirectory(dir: string) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (!fs.existsSync(dir)) {
                this.logger_.info(`packdbloader: directory '${dir}' does not exist - skipping`) ;
                resolve() ;
                return ;
            }

            this.logger_.silly(`packdbloader: scanning directory '${dir}'`) ;
            for(let file of fs.readdirSync(dir)) {
                let fullpath = path.join(dir, file) ;
                if (path.extname(file) === '.json') {
                    this.checkOneJSONFile(fullpath) ;
                }
            }
            resolve() ;
        }) ;

        return ret ;
    }

    private checkOneJSONFile(file: string) {
        this.logger_.silly(`packdbloader: checking file '${file}'`) ;
        let obj : IDCEntry ;
        
        try {
            obj = MTBUtils.readJSONFile(this.logger_, 'packdbloader', file) as IDCEntry ;
        }
        catch(err) {
            return ;
        }

        if (!obj.type || obj.type !== 'content-pack') {
            // not a content pack but might be a tool of interest
            this.logger_.silly(`packdbloader: file '${file}' is not a content pack - checking if it is a tool`) ;
            this.checkTool(obj) ;
        }
        else {
            // content pack
            this.logger_.silly(`packdbloader: file '${file}' is a content pack - loading it`) ;
            if (obj.path && fs.existsSync(obj.path)) {
                this.checkPack(obj) ;
            }
        }
    }

    private checkTool(obj: any) {
        let exepaths = [] ;
        if (obj.path) {
            exepaths.push(obj.path) ;
        }
        if (obj.exePath) {
            exepaths.push(obj.exePath) ;
        }

        if (obj.attributes && obj.attributes && obj.attributes['tools-root']) {
            this.toolsdb_.addToolsDir({ dir: obj.attributes['tools-root'], source: MTBToolSource.idc}) ;
        }
        else {
            let extdir : string | undefined = undefined ;

            for(let one of exepaths) {
                extdir = this.searchParents(one, 'mtbprops.json') ;
                if (extdir) {
                    break ;
                }
            }

            if (!extdir) {
                for(let one of exepaths) {
                    extdir = this.searchParents(one, 'props.json') ;
                    if (extdir) {
                        break ;
                    }
                }
            }

            if (extdir) {
                this.toolsdb_.addToolsDir({ dir: path.dirname(extdir), source: MTBToolSource.idc }) ;
            }
        }
    }

    private searchParents(dir: string, file: string) : string | undefined {
        while (!MTBUtils.isRootPath(dir)) {
            let fpath = path.join(dir, file) ;
            if (fs.existsSync(fpath)) {
                return fpath ;
            }

            dir = path.dirname(dir) ;
        }
        return undefined ;
    }

    private checkPack(obj: any) {
        this.packdb_.addPack(obj) ;
    }
}