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

import * as fs from 'fs';
import * as path from 'path';
import { URI } from 'vscode-uri';
import { MTBNames } from '../misc/mtbnames';
import { MTBUtils } from '../misc/mtbutils';
import { MTBDirectoryList } from './mtbdirlist';

export enum MTBAssetRequestLocation {
    LOCAL,
    SHARED,
    GLOBAL,
    ABSOLUTE,
    PROJECT,
    UNKNOWN
}

export enum MTBAssetStorageFormat {
    MTB,
    MTBX,
    UNKNOWN
}

export class MTBAssetRequest {
    private location_type_ : MTBAssetRequestLocation ;
    private storage_format_ : MTBAssetStorageFormat ;
    private reponame_ : string ;
    private asset_name_ : string ;
    private uri_ : URI ;
    private commit_ : string ;
    private is_direct_ : boolean ;
    private path_ : string ;
    private source_? : string ;

    constructor(uri: URI, commit: string, locfield: string, stype: MTBAssetStorageFormat, direct: boolean) {
        this.storage_format_ = stype ;
        this.location_type_ = MTBAssetRequest.getLocationTypeFromString(locfield) ;
        this.reponame_ = MTBAssetRequest.getRepoNameFromLocation(this.location_type_, locfield) ;
        this.asset_name_ = this.reponame_ ;
        this.uri_ = uri ;
        this.commit_ = commit ;
        this.is_direct_ = direct ;
        this.path_ = this.getPathFromString(locfield) ;
    }

    public locationType() : MTBAssetRequestLocation {
        return this.location_type_ ;
    }

    public get isLocal() { 
        return this.location_type_ === MTBAssetRequestLocation.LOCAL ;
    }

    public get isShared() { 
        return this.location_type_ === MTBAssetRequestLocation.SHARED ;
    }

    public get isGlobal() { 
        return this.location_type_ === MTBAssetRequestLocation.GLOBAL ;
    }

    public get isAbsolute() : boolean {
        return this.location_type_ === MTBAssetRequestLocation.ABSOLUTE ;
    }

    public get isProject() : boolean {
        return this.location_type_ === MTBAssetRequestLocation.PROJECT ;
    }

    public isBSP() : boolean {
        return this.reponame_.startsWith(MTBNames.TARGET_PREFIX) ;
    }
    
    public repoName() : string {
        return this.reponame_ ;
    }

    public storageFormat() : MTBAssetStorageFormat {    
        return this.storage_format_ ;
    }

    public name() : string {
        return this.asset_name_ ;
    }

    public uri() : URI { 
        return this.uri_ ;
    }

    public commit() : string {
        return this.commit_ ;
    }   

    public isDirect() : boolean {
        return this.is_direct_ ;
    }

    public path() : string {
        return this.path_ ;
    }

    public setPath(path: string) : void {
        this.path_ = path ;
    }

    public setSource(source: string) : void {
        this.source_ = source ;
    }

    public source() : string | undefined {
        return this.source_ ;
    }

    /**
     * Resolve the path of the asset request to a full path based on the directory list.  This is
     * a path to the 
     * @param dirlist the set of special directories that are used to resolve the path
     * @returns 
     */
    public fullPath(dirlist: MTBDirectoryList) : string {
        let ret : string = '' ;

        switch(this.location_type_) {
            case MTBAssetRequestLocation.ABSOLUTE:
                ret = this.path_ ;
                break ;

            case MTBAssetRequestLocation.GLOBAL:
                ret = path.join(dirlist.globaldir, this.path_) ;
                break ;                

            case MTBAssetRequestLocation.LOCAL:
                ret = path.join(dirlist.localdir, this.path_) ;
                break ;

            case MTBAssetRequestLocation.SHARED:
                ret = path.join(dirlist.shareddir, this.path_) ;
                break ;

            case MTBAssetRequestLocation.PROJECT:
                ret = path.join(dirlist.projdir, this.path_) ;
                break ;

            default:
                ret = '' ;
        }
        return ret ;
    }

    public cloneTarget(dirlist: MTBDirectoryList) : string {
        let apath = this.fullPath(dirlist) ;
        return path.basename(apath) ;
    }

    /**
     * Resolve the path of the asset request to the path where the clone command should be
     * run to clone the asset.  This is a path to the directory where the asset should be cloned.
     * @param dirlist the set of special directories that are used to resolve the path
     * @returns path to where the asset should be cloned
     */
    public cloneDir(dirlist: MTBDirectoryList) : string {
        let ret : string = '' ;

        switch(this.location_type_) {
            case MTBAssetRequestLocation.ABSOLUTE:
                ret = this.path_ ;
                break ;

            case MTBAssetRequestLocation.GLOBAL:
                ret = path.join(dirlist.globaldir, this.path_) ;
                break ;                

            case MTBAssetRequestLocation.LOCAL:
                ret = path.join(dirlist.localdir, this.path_) ;
                break ;

            case MTBAssetRequestLocation.SHARED:
                ret = path.join(dirlist.shareddir, this.path_) ;
                break ;

            case MTBAssetRequestLocation.PROJECT:
                ret = path.join(dirlist.projdir, this.path_) ;
                break ;

            default:
                ret = '' ;
        }

        return path.dirname(ret) ;
    }

    public static createFromFile(file: string, stype: MTBAssetStorageFormat, isDirect: boolean) : MTBAssetRequest {
        let ret : MTBAssetRequest ;

        if (!fs.existsSync(file)) {
            throw new Error(`the file ${file} does not exist`) ;
        }
        else {
            let data = fs.readFileSync(file, 'utf-8') ;
            let lines = data.split('\n') ;

            if (lines.length === 2 && lines[1].trim().length == 0) {
                lines = [lines[0]] ;
            }

            if (lines.length !== 1) {
                throw new Error(`the file ${file} does not contain a valid MTB asset request - it must contain a single line`) ;
            }

            let parts = lines[0].split('#') ;
            if (parts.length !== 3) {
                throw new Error(`the file ${file} does not contain a valid MTB asset request - it must contain 3 parts separated by colons`) ;
            }

            if (!MTBUtils.isValidUri(parts[0])) {
                throw new Error(`the file ${file} does not contain a valid MTB asset request - the URI is invalid`) ;
            }

            let loctype = this.getLocationTypeFromString(parts[2]) ;
            let reponame = this.getRepoNameFromLocation(loctype, parts[2]) ;
            if (reponame.length === 0) {
                throw new Error(`the file ${file} does not contain a valid MTB asset request - the location is invalid`) ;
            }

            let uri = URI.parse(parts[0].trim()) ;
            ret = new MTBAssetRequest(uri, parts[1], parts[2], stype, isDirect) ;
        }
        return ret;
    }


    private static getLocationTypeFromString(locationString: string) : MTBAssetRequestLocation {
        let locationType: MTBAssetRequestLocation = MTBAssetRequestLocation.PROJECT;

        if (locationString.startsWith(MTBNames.SENTINEL_ABSOLUTE))
        {
            locationType = MTBAssetRequestLocation.ABSOLUTE;
        }
        if (locationString.startsWith(MTBNames.SENTINEL_GLOBAL))
        {
            locationType = MTBAssetRequestLocation.GLOBAL;
        }
        if (locationString.startsWith(MTBNames.SENTINEL_LOCAL))
        {
            locationType = MTBAssetRequestLocation.LOCAL;
        }
        if (locationString.startsWith(MTBNames.SENTINEL_SHARED))
        {
            locationType = MTBAssetRequestLocation.SHARED;
        }
    
        return locationType;
    }

    private getPathFromString(locationString: string) : string {
        let regex = /(\$\$[A-Z_]+\$\$)(.*)/ ;
        let ret = locationString ;
        let m = regex.exec(locationString);

        if (m && m[1] && m[2])
        {
            if (m[1] === MTBNames.SENTINEL_LOCAL && m[2].length === 0) {
                ret = this.reponame_ ;
            }
            else {
                ret = m[2] ;
                if (this.isLocal || this.isShared || this.isGlobal) {
                    if (ret.startsWith('/')) {
                        ret = ret.substring(1);
                    }
                }
            }
        }
        return ret;
    }

    private static getRepoNameFromLocation(location: MTBAssetRequestLocation, locationString: string) : string {

        let repoName: string = '';
        let splitSlot: number = -1; // counted from the end. 0 is the last one

        // Separate the token from the data and remove any empty strings
        let bigParts = locationString.split('$$').filter(function (el) { return el.length !== 0 ; }) ;
        let smallParts : string[] = [] ;

        if (bigParts.length === 1 || bigParts.length === 2) {
            smallParts = bigParts[bigParts.length - 1].split('/') ;
            smallParts = smallParts.filter(function (el) { return el.length !== 0 ; }) ;
        }

        switch(location) {
            case MTBAssetRequestLocation.LOCAL:
            case MTBAssetRequestLocation.ABSOLUTE:
            case MTBAssetRequestLocation.PROJECT:
                splitSlot = 0 ;
                break ;

            case MTBAssetRequestLocation.SHARED:
            case MTBAssetRequestLocation.GLOBAL:
                splitSlot = 1 ;
                break ;
        }
        if (splitSlot >= 0 && smallParts.length >= 1 + splitSlot)
        {
            repoName = smallParts[smallParts.length - 1 - splitSlot];
        }
        return repoName;
    }
}