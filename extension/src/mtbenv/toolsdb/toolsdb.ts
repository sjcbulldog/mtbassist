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

import { MTBTool } from "./mtbtool";
import * as path from 'path' ;
import * as fs from 'fs' ;
import { MTBUtils } from "../misc/mtbutils";
import { MTBPack } from "../packdb/mtbpack";
import * as winston from 'winston';

export enum MTBToolSource {
    techPack = 'tech-pack',
    eap = 'early-access-pack',
    toolsDir = 'tools-dir',
    idc = 'idc',
}

export interface MTBToolDir {
    dir: string ;
    source: MTBToolSource ;
};

export class ToolsDB {
    private toolsDirs_ : MTBToolDir[] = [] ;
    private activeTools_ : Map<string, MTBTool> = new Map() ;
    private tools_: MTBTool[] = [] ;

    constructor() {
    }

    public get activeSet() : MTBTool[] {
        return Array.from(this.activeTools_.values()) ;
    }

    public addToolsDir(dir: MTBToolDir) {
        this.toolsDirs_.push(dir);
    }

    public findToolProgramPath(guid: string, ...subpaths: string[]) : string | undefined {
        let tool = this.findToolByGUID(guid) ;
        if (tool !== undefined) {
            let p = path.join(tool.path, ...subpaths) ;
            if (process.platform === 'win32') { 
                p += '.exe' ;
            }

            if (!fs.existsSync(p)) {
                return undefined ;
            }
            return p ;
        }
        return undefined ;
    }

    public findToolByGUID(guid: string) : MTBTool | undefined {
        for(let tool of this.activeTools_.values()) {
            if (tool.id === guid) {
                return tool ;
            }
        }
        return undefined ;
    }

    public scanAll(logger: winston.Logger) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            for(let one of this.toolsDirs_) {
                let p = this.scanForTools(logger, one) ;
            }

            resolve() ;
        }) ;
        return ret;
    }

    public setActiveToolSet(eap: MTBPack | undefined) {
        this.activeTools_.clear() ;

        for(let tool of this.tools_) {
            let current = this.activeTools_.get(tool.id) ;
            if (current === undefined) {
                //
                // There is no current tool with this id, so we can add it
                //
                this.activeTools_.set(tool.id, tool) ;
            }
            else if (tool.source === MTBToolSource.eap) {
                //
                // There is a tool from the EAP pack.  It always takes precedence
                //
                this.activeTools_.set(tool.id, tool) ;
            }
            else if (current.source !== MTBToolSource.eap && tool.version.isGreaterThen(current.version)) {
                //
                // We found a tool with a newer version, and the existing tool is not from the EAP pack.  We
                // will use it
                //
                this.activeTools_.set(tool.id, tool) ;
            }
        }
    }

    private scanForTools(logger: winston.Logger, dir: MTBToolDir) {
        if (fs.existsSync(dir.dir) && fs.statSync(dir.dir).isDirectory()) {
            for(let one of fs.readdirSync(dir.dir)) {
                let fullpath = path.join(dir.dir, one) ;
                if (fs.statSync(fullpath).isDirectory()) {
                    this.scanForTool(logger, fullpath, dir.source) ;
                }
            }
        }
    }

    private scanForTool(logger: winston.Logger, dir: string, source: MTBToolSource)  {
        let jsonfile = path.join(dir, "props.json") ;
        if (!fs.existsSync(jsonfile)) {
            jsonfile = path.join(dir, "mtbprops.json") ;
            if (!fs.existsSync(jsonfile)) {
                return ;
            }
        }

        logger.silly(`reading tools json file ${jsonfile}`) ;

        let props = MTBUtils.readJSONFile(logger, 'toolsdb', jsonfile) ;
        if (props.prop_files && Array.isArray(props.prop_files)) {
            for(let one of props.prop_files) {
                let fpath = path.join(dir, one) ;
                if (fs.existsSync(fpath) && fs.statSync(fpath).isFile()) {
                    props = MTBUtils.readJSONFile(logger, 'toolsdb', fpath) ;
                    if (props.core && props.core.id && props.core.name && props.core.version) {
                        let tool = new MTBTool(dir, props, source) ;
                        this.tools_.push(tool) ;
                    }
                }
            }
        }
        else if (props.core && props.core.id && props.core.name && props.core.version) {
            let tool = new MTBTool(dir, props, source) ;
            this.tools_.push(tool) ;
        }
    }
}
