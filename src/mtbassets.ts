///
// Copyright 2022 by Apollo Software
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
import * as vscode from 'vscode';
import * as path from 'path' ;
import * as fs from 'fs' ;
import * as open from 'open' ;

import { MTBAppInfo, theModusToolboxApp } from "./mtbappinfo";
import { MessageType, MTBExtensionInfo } from './mtbextinfo';
import { getMTBAssetProvider } from './mtbassetprovider';
import { platform } from 'os';
import { env } from 'process';
import { MTBApp } from './manifest/mtbapp';

export class MTBAssetInstance
{
    static readonly mtbAssetName: string = "$$ASSET_REPO$$" ;
    static readonly mtbLocalName: string = "$$LOCAL$$" ;

    public id?: string ;
    public url?: string ;
    public version?: string ;
    public location?: string ;
    public isValid: boolean ;

    constructor() {
        this.id = undefined ;
        this.url = undefined ;
        this.version = undefined ;
        this.location = undefined ;
        this.id = undefined ;
        this.isValid = false ;
    }

    static relPathToAbs (rpath: string) : string {
        let ret: string = rpath ;
        
        if (!path.isAbsolute(rpath))
        {
            if (theModusToolboxApp) {
                ret = path.normalize(path.join(theModusToolboxApp.appDir, rpath)) ;
            }
        }

        if (process.platform === "win32" && ret.length > 2) {
            let drive: string = ret.charAt(0) ;
            if (drive >= 'a' && drive <= 'z') {
                ret = drive.toUpperCase() + ret.substring(1) ;
            }
        }

        return ret ;
    }

    static mtbPathCompare(full: string, sub: string) : boolean {
        let subpath = MTBAssetInstance.relPathToAbs(sub) ;
        let fullpath = MTBAssetInstance.relPathToAbs(full) ;

        return fullpath.startsWith(subpath) ;
    }

    static mtbPathToInstance(path: string) : MTBAssetInstance | undefined {
        let ret : MTBAssetInstance | undefined ;
        if (theModusToolboxApp?.assets) {
            for(let asset of theModusToolboxApp.assets) {
                if (asset.isValid) {
                    if (this.mtbPathCompare(path, asset.location as string)) {
                        ret = asset ;
                    }
                }
            }
        }
        return ret ;
    }

    static processMTBContents(line: string) : MTBAssetInstance {
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
                    ret.location = path.join(theModusToolboxApp!.sharedDir!, loc.substring(this.mtbAssetName.length));
                }
                else if (loc.startsWith(this.mtbLocalName)) {
                    ret.location = path.join(theModusToolboxApp!.libsDir!, loc.substring(this.mtbLocalName.length));
                }
                else {
                    ret.location = path.join(theModusToolboxApp!.appDir, loc) ;
                }

                ret.location = path.normalize(ret.location) ;

                ret.isValid = true ;
            }
        }

        return ret;
    }

    static readMtbFile(filename: string) : Promise<MTBAssetInstance> {
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
                    let ret = this.processMTBContents(buf.toString()) ;
                    resolve(ret) ;
                }
            }) ;
        }) ;

        return ret ;
    }

    static adjustAssetsPane(appinfo: MTBAppInfo) {
        if (appinfo?.assets) {
            appinfo?.assets.sort((a, b) : number => {
                if (b.id!.toLowerCase() > a.id!.toLowerCase()) {
                    return -1 ;
                }
                if (a.id!.toLowerCase() > b.id!.toLowerCase()) {
                    return 1 ;
                }

                return 0 ;
            }) ;
        }
        getMTBAssetProvider().refresh(appinfo!.assets) ;
    }

    static scanOneDir(appinfo: MTBAppInfo, dirname: string) {
        fs.readdir(dirname, (err, files) => {
            if (err) {
                let errmgs = err as Error ;
                let extinfo: MTBExtensionInfo = MTBExtensionInfo.getMtbExtensionInfo() ;
                extinfo.logMessage(MessageType.error, "error scanning directory '" + dirname + "' - " + errmgs.message) ;
            }
            else {
                for(var file of files) {
                    if (path.extname(file) === '.mtb') {
                        this.readMtbFile(path.join(dirname, file))
                            .then((asset) => {
                                theModusToolboxApp!.assets.push(asset) ;
                                this.adjustAssetsPane(appinfo) ;
                            })
                            .catch((err) => {
                            }) ;
                    }
                } ;
            }
        }) ;
    }

    public static mtbLoadAssetInstance(appinfo: MTBAppInfo) {
        if (appinfo?.libsDir) {
            this.scanOneDir(appinfo, appinfo.libsDir) ;
        }
        if (appinfo?.depsDir) {
            this.scanOneDir(appinfo, appinfo.depsDir) ;
        }
    }


    public displayDocs() {
        if (theModusToolboxApp?.launch) {
            let found: boolean = false ;
            for(var doc of theModusToolboxApp.launch.docs) {
                if (this.location) {
                    if (MTBAssetInstance.mtbPathCompare(doc.location, this.location)) {
                        open(decodeURIComponent(doc.location)) ;
                        found = true ;
                        break ;
                    }
                }
            } ;

            if (!found) {
                vscode.window.showInformationMessage("The asset '" + this.id + "' does not contain documentation") ;
            }
        }
    }
}
