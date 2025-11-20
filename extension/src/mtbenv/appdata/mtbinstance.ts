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

import * as path from "path";
import * as fs from "fs";
import { MTBVersion } from "../misc/mtbversion";

export class MTBInstance {
    private static readonly versionXMLRegEx = /^<version>([\d.]+)<\/version>$/ ;
    private static readonly versionTXTRegEx = /^([\d.]+)$/ ;

    private rootdir_? : string ;
    private version_? : MTBVersion ;
    private props_ : Map<string, any> = new Map<string, any>();
    private name_? : string ;
    private id_? : string ;

    protected props_obj_ : any ;

    constructor(rootdir: string) {
        this.rootdir_ = rootdir ;
        if (!fs.existsSync(this.rootdir_)) {
            throw new Error(`Root directory does not exist: ${this.rootdir_}`) ;
        }
        this.init() ;
        this.computeAssetName() ;
    }

    public get name() : string | undefined {
        return this.name_ ;
    }

    public get rootdir() : string | undefined{
        return this.rootdir_;
    }

    public get version() : MTBVersion | undefined {
        return this.version_;
    }

    public get id() : string | undefined {
        return this.id_ ;
    }

    protected set version(v: MTBVersion | undefined) {
        this.version_ = v;
    }

    public get props() : Map<string, any> {
        return this.props_;
    }

    private computeAssetName() {
        if (this.rootdir_) {
            this.name_ = path.basename(this.rootdir_);
            if (/[a-zA-Z_]+-v\d+\.\d+\.\d+/.test(this.name_)) {
                let tmp = path.dirname(this.rootdir_);
                this.name_ = path.basename(tmp) ;
            }
        }
    }

    private init() { 
        let verxml = path.join(this.rootdir_!, 'version.xml') ;
        let vertxt = path.join(this.rootdir_!, 'version.txt') ;
        let propsjson = path.join(this.rootdir_!, 'props.json') ;

        if (fs.existsSync(verxml)) {
            let ver = fs.readFileSync(verxml, 'utf8').trim() ;
            let match = ver.match(MTBInstance.versionXMLRegEx) ;
            if (match && match[1]) {
                this.version_ = MTBVersion.fromVersionString(match[1]) ;
            }
            else {
                throw new Error(`Invalid version format in ${verxml}`) ;
            }
        }
        else if (fs.existsSync(vertxt)) {
            let ver = fs.readFileSync(vertxt, 'utf8').trim() ;
            let match = ver.match(MTBInstance.versionTXTRegEx) ;
            if (match && match[1]) {
                this.version_ = MTBVersion.fromVersionString(match[1]) ;
            }
            else {
                throw new Error(`Invalid version format in ${vertxt}`) ;
            }
        }        

        if (fs.existsSync(propsjson)) {
            this.readPropsFile(propsjson) ;
        }

        if (!this.version_) {
            // TODO: ok, the aws stuff does not have version files, set to 0.0.0 for now
            this.version_ = new MTBVersion(0, 0, 0) ;
        }
    }

    private readPropsFile(name: string) {
        this.props_obj_ = JSON.parse(fs.readFileSync(name, 'utf8')) ;
        for(let key in this.props_obj_) {
            this.props_.set(key, this.props_obj_[key]) ;
        }

        if (this.props_obj_.hasOwnProperty('core') && typeof this.props_obj_.core === 'object') {
            if (!this.version_ && this.props_obj_.core.hasOwnProperty('version') && typeof this.props_obj_.core.version === 'string') {
                this.version_ = MTBVersion.fromVersionString(this.props_obj_.core.version) ;
            }

            if (this.props_obj_.core.hasOwnProperty('name') && typeof this.props_obj_.core.name === 'string') {
                // TODO: make sure this.props_obj_.json core.name field matches the instance name from the path
            }

            if (this.props_obj_.core.hasOwnProperty('id') && typeof this.props_obj_.core.id === 'string') {
                this.props_.set('id', this.props_obj_.core.id) ;
            }
        }
    }
}