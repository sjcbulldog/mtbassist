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

//
// This file loads the and maintains the information about the current ModusToolbox
// application.
//
// A new application is loaded by calling mtbAssistLoadApp(appDir) where appDir is
// the directory that contains the ModusToolbox application.  Once this API is called
// the application can be accessed via the global theModusToolboxApp.  The load happens
// in the background and the load may fail, so it is important to check the isLoading
// member to see if the loading processes is underway.  If the load fails or has never
// happened, the isValid member will be false.
//
import * as path from 'path' ;
import * as fs from 'fs' ;
import * as open from 'open' ;

import { MTBAppInfo, theModusToolboxApp } from "./mtbappinfo";
import { MessageType, MTBExtensionInfo } from '../mtbextinfo';
import { getMTBAssetProvider } from '../mtbassetprovider';
import { MTBProjectInfo } from './mtbprojinfo';

export class MTBAssetInstance
{
    static readonly mtbAssetName: string = "$$ASSET_REPO$$" ;
    static readonly mtbLocalName: string = "$$LOCAL$$" ;

    public id?: string ;
    public url?: string ;
    public version?: string ;
    public location?: string ;
    public fullpath?: string ;
    public isValid: boolean ;

    constructor() {
        this.id = undefined ;
        this.url = undefined ;
        this.version = undefined ;
        this.location = undefined ;
        this.fullpath = undefined ;
        this.id = undefined ;
        this.isValid = false ;
    }

    static relPathToAbs (projinfo?: MTBProjectInfo, rpath?: string) : string {
        let ret: string = rpath! ;
        
        if (!path.isAbsolute(rpath!) && projinfo)
        {
            ret = path.normalize(path.join(projinfo.getProjectDir(), rpath!)) ;
        }

        if (process.platform === "win32" && ret.length > 2) {
            let drive: string = ret.charAt(0) ;
            if (drive >= 'a' && drive <= 'z') {
                ret = drive.toUpperCase() + ret.substring(1) ;
            }
        }

        return ret ;
    }

    static mtbPathCompare(projinfo?: MTBProjectInfo, full?: string, sub?: string) : boolean {
        let subpath = MTBAssetInstance.relPathToAbs(projinfo, sub) ;
        let fullpath = MTBAssetInstance.relPathToAbs(projinfo, full) ;

        return fullpath.startsWith(subpath) ;
    }

    static mtbPathToInstance(path: string) : MTBAssetInstance | undefined {
        let ret : MTBAssetInstance | undefined = undefined ;

        if (theModusToolboxApp) {
            for(let proj of theModusToolboxApp.projects) {
                for(let asset of proj.assets) {
                    if (asset.isValid) {
                        if (this.mtbPathCompare(proj, path, asset.location as string)) {
                            ret = asset ;
                        }
                    }
                }
            }
        }
        return ret ;
    }

    static processMTBContents(projinfo: MTBProjectInfo, line: string) : MTBAssetInstance {
        let ret : MTBAssetInstance = new MTBAssetInstance() ;

        let parts: string[] = line.split('#') ;
        if (parts.length === 3) {
            ret.url = parts[0] ;
            ret.version = parts[1] ;
            let loc: string = parts[2].trim() ;

            let index: number = parts[0].lastIndexOf('/') ;
            if (index !== -1) {

                ret.id = parts[0].substring(index + 1) ;
                if (ret.id.startsWith("TARGET_")) {
                    ret.id = ret.id.substring(7) ;
                }

                if (loc.startsWith(this.mtbAssetName))  {
                    ret.location = path.join(projinfo.sharedDir!, loc.substring(this.mtbAssetName.length));
                }
                else if (loc.startsWith(this.mtbLocalName)) {
                    ret.location = path.join(projinfo.libsDir!, loc.substring(this.mtbLocalName.length));
                }
                else {
                    ret.location = path.join(projinfo.getProjectDir(), loc) ;
                }

                ret.location = path.normalize(ret.location) ;
                ret.fullpath = MTBAssetInstance.relPathToAbs(projinfo, ret.location) ;

                ret.isValid = true ;
            }
        }

        return ret;
    }

    static readMtbFile(projinfo: MTBProjectInfo, filename: string) : Promise<MTBAssetInstance> {
        let ret = new Promise<MTBAssetInstance>((resolve, reject) => {
            let extinfo: MTBExtensionInfo = MTBExtensionInfo.getMtbExtensionInfo() ;
            extinfo.logMessage(MessageType.debug, "reading MTB file '" + filename + "'") ;

            fs.readFile(filename, (err, buf) => {
                if (err) {
                    let errmgs = err as Error ;
                    let extinfo: MTBExtensionInfo = MTBExtensionInfo.getMtbExtensionInfo() ;
                    extinfo.logMessage(MessageType.error, "error reading mtb file '" + filename + "' - " + errmgs.message) ;
                    reject(err) ;
                }
                else {
                    let ret = this.processMTBContents(projinfo, buf.toString()) ;
                    resolve(ret) ;
                }
            }) ;
        }) ;

        return ret ;
    }

    static adjustAssetsPane(projinfo: MTBProjectInfo) {
        if (projinfo.assets) {
            projinfo.assets.sort((a, b) : number => {
                if (b.id!.toLowerCase() > a.id!.toLowerCase()) {
                    return -1 ;
                }
                if (a.id!.toLowerCase() > b.id!.toLowerCase()) {
                    return 1 ;
                }

                return 0 ;
            }) ;
        }
        getMTBAssetProvider().refresh(projinfo.name, projinfo.assets) ;
    }

    static scanOneDir(projinfo: MTBProjectInfo, dirname: string) {
        fs.readdir(dirname, (err, files) => {
            if (err) {
                let errmgs = err as Error ;
                let extinfo: MTBExtensionInfo = MTBExtensionInfo.getMtbExtensionInfo() ;
                extinfo.logMessage(MessageType.error, "error scanning directory '" + dirname + "' - " + errmgs.message) ;
            }
            else {
                for(var file of files) {
                    if (path.extname(file) === '.mtb') {
                        this.readMtbFile(projinfo, path.join(dirname, file))
                            .then((asset) => {
                                projinfo.assets.push(asset) ;
                                this.adjustAssetsPane(projinfo) ;
                            })
                            .catch((err) => {
                            }) ;
                    }
                } ;
            }
        }) ;
    }

    public static mtbLoadAssetInstance(projinfo: MTBProjectInfo) : Promise<void> {
        let ret : Promise<void> = new Promise<void>((resolve, reject) => {
            if (projinfo?.libsDir) {
                this.scanOneDir(projinfo, projinfo.libsDir) ;
            }
            if (projinfo?.depsDir) {
                this.scanOneDir(projinfo, projinfo.depsDir) ;
            }
            resolve() ;
        }) ;

        return ret ;
    }
    
    public displayDocs() {
        if (theModusToolboxApp?.launch) {
            theModusToolboxApp.launch.docs.forEach(doc => {
                if (this.location) {
                    if (MTBAssetInstance.mtbPathCompare(undefined, doc.location, this.fullpath)) {
                        open(decodeURIComponent(doc.location)) ;
                    }
                }
            }) ;
        }
    }
}
