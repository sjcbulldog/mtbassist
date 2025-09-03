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


import { URI } from "vscode-uri";
import { MTBItemVersion } from "./mtbitemversion";
import { MTBVersion } from '../misc/mtbversion';
import * as winston from 'winston';
import { PackManifest } from "../packdb/packdb";

export class MTBItem
{
    public readonly name: string;
    public readonly source: PackManifest ;
    public readonly id: string;
    public readonly versions: MTBItemVersion[];
    public readonly provides: string[] = [] ;
    public readonly requires: string[] = [] ;
    public readonly requiresv2: string[] = [] ;

    constructor(src: PackManifest, id: string, name: string, versions: MTBItemVersion[]) {
        this.name = name ;
        this.source = src ;
        this.id = id ;
        this.versions = versions ;
    }

    public setProvides(provides: string[]) {    
        this.provides.push(...provides) ;
        this.provides.sort() ;
    }

    public setRequires(reqs: string[]) {
        this.requires.push(...reqs) ;
        this.requires.sort() ;
    }

    public setRequires2(reqs: string[]) {
        this.requiresv2.push(...reqs) ;
        this.requiresv2.sort() ;
    }

    private getVersionFromCommit(commit: string) : MTBVersion | undefined {
        let i = commit.indexOf('-');
        if (i === -1) {
            return undefined;
        }

        let versionStr = commit.substring(i + 1);
        return MTBVersion.fromVVersionString(versionStr);
    }

    public get getLatestVersion() : MTBItemVersion | undefined {
        if (this.versions.length > 0) {
            let vlist = this.versions.filter((v) => v.num.toLowerCase().indexOf('latest') === -1) ;
            let ret : MTBItemVersion | undefined = undefined ;
            let retver : MTBVersion | undefined = undefined ;
            for(let v of vlist) {
                let vver = this.getVersionFromCommit(v.commit) ;
                if (!vver) {
                    continue;
                }

                if (ret === undefined) {
                    ret = v ;
                    retver = vver ;
                }
                else if (MTBVersion.compare(retver!, vver) < 0) {
                    ret = v ;
                    retver = vver ;
                }
            }
            return ret ;
        }
        return undefined ;
    }

    public containsVersion(num: string) : boolean {
        for(let ver of this.versions) {
            if (ver.num === num) {
                return true ;
            }
        }
        
        return false ;
    }

    public findVersion(commit: string) : MTBItemVersion | undefined {
        for(var ver of this.versions) {
            if (ver.commit === commit) {
                return ver ;
            }
        }

        return undefined ;
    }

    public newerVersions(version: string) : string[] {
        let ret : string[] = [] ;
        let current: MTBVersion = MTBVersion.fromVVersionString(version) ;

        for(var item of this.versions) {
            let itemver = MTBVersion.fromVVersionString(item.commit) ;
            if (MTBVersion.compare(current, itemver) < 0) {
                ret.push(item.commit) ;
            }
        }

        return ret ;
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

    protected static mergeMsg(logger: winston.Logger, id: string, typestr: string, field: string, f1: string, f2:string, src1: URI, src2: URI) {
        let msg: string = "two instances of '" + typestr + "' - '" + id + "' were merged with differing '" + field + "' fields" ;
        logger.silly(msg) ;
        msg = "    the first instance was from '" + src1.toString() + "'" ;
        logger.silly(msg) ;
        msg = "    the second instance was from '" + src2.toString() + "'" ;
        logger.silly(msg) ;
        msg = "    the first '" + field + "' value was '" + f1 + "'" ;
        logger.silly(msg) ;
        msg = "    the second '" + field + "' value was '" + f2 + "'" ;
        logger.silly(msg) ;
    }
}