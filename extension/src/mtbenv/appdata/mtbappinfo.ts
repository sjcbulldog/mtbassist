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

import * as path from 'path' ;
import { MTBNames } from "../misc/mtbnames";
import { ModusToolboxEnvironment } from "../mtbenv/mtbenv";
import { MTBAppLoader } from "./mtbapploader";
import { MTBProjectInfo } from "./mtbprojinfo";
import * as winston from 'winston';

export enum ApplicationType {
    unknown,
    combined,
    application
}

export class MTBAppInfo {
    private static appRequiredVars : string[] = [
        MTBNames.MTB_TYPE,
        MTBNames.MTB_PROJECTS,
        MTBNames.MTB_QUERY,
        MTBNames.MTB_TOOLS_DIR,
        MTBNames.MTB_BUILD_SUPPORT,
    ];

    private type_ : ApplicationType ;
    private appdir_ : string ;
    private env_ : ModusToolboxEnvironment ;
    private projects_ : MTBProjectInfo[] = [] ;
    private vars_? : Map<string, string> ;

    constructor(env: ModusToolboxEnvironment, appdir: string) {
        this.type_ = ApplicationType.unknown ;
        this.appdir_ = appdir ;
        this.env_ = env ;
    }

    public setVars(vars: Map<string, string>) {
        this.vars_ = vars ;
    }

    public setType(type: ApplicationType) {
        this.type_ = type ;
    }

    public type() : ApplicationType {
        return this.type_ ;
    }

    public load(logger: winston.Logger) : Promise<void> {
        let loader = new MTBAppLoader(logger, this, this.env_.toolsDir!) ;
        return loader.load() ;
    }

    public get appdir() : string {
        return this.appdir_ ;
    }

    public get bspdir() : string {
        return path.join(this.appdir_, MTBNames.BSPsDir) ;
    }

    public addProject(proj: MTBProjectInfo) {
        this.projects_.push(proj) ;
    }

    public get projects() : MTBProjectInfo[] {
        return this.projects_ ;
    }

    public get loadedProjectCount() : number {
        return this.projects_.length ;
    }

    public get totalProjectCount() : number {
        if (!this.vars_) {
            throw new Error('MTBAppInfo.totalProjectCount called without setting the get_app_info vars') ;
        }

        return this.vars_.get(MTBNames.MTB_PROJECTS)?.split(',').length || 0 ;
    }

    public isValid() : Error | undefined {
        let msg = '' ;
        let ret = undefined ;

        if (!this.vars_) {
            return new Error('MTBAppInfo.isValid called without setting the get_app_info vars') ;
        }

        if (!this.vars_.has(MTBNames.MTB_TYPE)) {
            msg = `the project does not have an '${MTBNames.MTB_TYPE}' value` ;
            return new Error(msg) ;
        }

        const type = this.vars_.get(MTBNames.MTB_TYPE) ;
        if (type !== 'APPLICATION' && type !== 'COMBINED') {
            msg = `the project has an invalid '${MTBNames.MTB_TYPE}' value` ;
            return new Error(msg) ;
        }

        if (type === 'APPLICATION') {
            for(let v of MTBAppInfo.appRequiredVars) {
                if (!this.vars_.has(v)) {
                    if (msg.length > 0) {
                        msg += '\n' ;
                    }

                    msg += `the project does not have an '${v}' value` ;
                }
            }
        }

        if (msg.length) {
            ret = new Error(msg) ;
        }

        return ret ;
    }
}
