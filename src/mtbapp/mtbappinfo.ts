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

import * as vscode from 'vscode';
import * as path from 'path' ;

import * as fs from 'fs' ;

import { getMTBDocumentationTreeProvider } from '../mtbdocprovider';
import { getMTBProgramsTreeProvider } from '../mtbprogramsprovider';
import { MessageType, MTBExtensionInfo } from '../mtbextinfo';
import { MTBLaunchInfo } from '../mtblaunchdata';
import { getMTBProjectInfoProvider } from '../mtbprojinfoprovider';
import { MTBProjectInfo } from './mtbprojinfo';
import { runMakeGetAppInfo, runMakeVSCode, runMtbLaunch } from './mtbrunprogs';
import { ModusToolboxEnvTypeNames, ModusToolboxEnvVarNames } from './mtbnames';
import { addToRecentProjects } from '../mtbrecent';
import { mtbRunMakeGetLibs } from '../mtbcommands';

export enum AppType
{
    none,
    mtb2x,
    combined,
    multicore
} ;

export class MTBAppInfo
{
    // The top level directory for the application
    public appDir: string ;

    // The type of this application
    public appType : AppType ;

    // The name of the application
    public appName : string ;

    // The list of projects in the application
    public projects: MTBProjectInfo[];

    // The launch information (configurators and documentation) for the application
    public launch?: MTBLaunchInfo ;

    // If true, the application is currently loading
    public isLoading: boolean ;

    // If true, the application is loaded and valid
    public isValid: boolean ;

    // The extension context
    public context: vscode.ExtensionContext ;

    reload: boolean ;

    //
    // Create the application object and load its contents in the asynchronously
    //
    constructor(context: vscode.ExtensionContext, appdir : string) {
        this.appDir = "" ;
        this.projects = [] ;
        this.context = context ;
        this.setLaunchInfo(undefined) ;
        this.appType = AppType.none ;
        this.reload = false ;
        this.appName = "UNDEFINED" ;

        MTBExtensionInfo.getMtbExtensionInfo().manifestDb.addLoadedCallback(MTBAppInfo.manifestLoadedCallback) ;

        this.isValid = false ;
        this.isLoading = true ;
        this.initApp(appdir)
            .then (()=> {
                this.isValid = true ;
                this.isLoading = false ;

                for(let proj of this.projects) {
                    getMTBProjectInfoProvider().refresh(proj) ;
                }

                if (appdir) {
                    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
                        //
                        // The ModusToolbox application directory is loaded, but the workspace file is not
                        // ModusToolbox works much better when the genreated workspace file is loaded.  If we see
                        // it, we load the workspace file.
                        //
                        let dirname = path.basename(vscode.workspace.workspaceFolders[0].uri.fsPath) ;
                        let filename = this.appName + ".code-workspace" ;
                        let wksp : string = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, filename) ;
                        if (fs.existsSync(wksp)) {
                            vscode.window.showInformationMessage("Loading worksapce file '" + filename + "'") ;
                            let wkspuri : vscode.Uri = vscode.Uri.file(wksp) ;
                            vscode.commands.executeCommand("vscode.openFolder", wkspuri) ;
                        }

                        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "loaded ModusToolbox application '" + this.appDir + "'") ;
                        vscode.window.showInformationMessage("ModusToolbox application loaded and ready") ;
                    }                    
                    addToRecentProjects(context, appdir) ;
                }
            })
            .catch((error) => {
                this.isValid = false ;
                this.isLoading = false ;
                MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "the application directory '" + appdir + "' is not a ModusToolbox application") ;
            }) ;
    }

    //
    // This method determines the application type.  It basically figures out if this is a
    // single project or multi project application and whether it is a 2x or 3x project.  It
    // also detects if this is not a ModusToolbox application at all.
    //
    private checkAppType() : Promise<[AppType, Map<string, string>]> {
        let ret : Promise<[AppType, Map<string, string>]> = new Promise<[AppType, Map<string, string>]>((resolve, reject) => {
            runMakeGetAppInfo(this.appDir)
                .then((data : Map<string, string>) => {
                    if (data.has(ModusToolboxEnvVarNames.MTB_TYPE)) {
                        let ptype: string = data.get(ModusToolboxEnvVarNames.MTB_TYPE)! ;
                        if (ptype === ModusToolboxEnvTypeNames.APPLICATION) {
                            resolve([AppType.multicore, data]) ;
                        }
                        else if (ptype === ModusToolboxEnvTypeNames.COMBINED) {
                            resolve([AppType.combined, data]) ;
                        }
                        else {
                            let err : Error = new Error("unknown MTB_TYPE in application '" + ptype + "'") ;
                            reject(err) ;
                        }
                    }
                    else if (data.has(ModusToolboxEnvVarNames.MTB_PROTOCOL)) {
                        resolve([AppType.mtb2x, data]) ;
                    }
                    else {
                        resolve([AppType.none, data]) ;
                    }
                })
                .catch((err : Error) => {
                    reject(err) ;
                }) ;
        }) ;

        return ret ;
    }

    //
    // This method performs the work that is common to the processing
    // of an application both single core and multi core.
    //
    private processCommonAppStuff() : Promise<void> {
        let ret : Promise<void> = new Promise<void>((resolve, reject) => {
            this.mtbUpdateProgs()
                .then(() => {
                    this.createVSCodeDirectory()
                        .then(() => {
                            let readme : string = path.join(this.appDir, "README.md") ;
                            if (fs.existsSync(readme)) {
                                let uri: vscode.Uri = vscode.Uri.file(readme) ;
                                vscode.commands.executeCommand("markdown.showPreview", uri) ;
                            }
                            resolve() ;
                        })
                        .catch((err: Error) => {
                            reject(err) ;
                        }) ;
                })
                .catch((err: Error) => {
                    reject(err) ;
                }) ;
        }) ;

        return ret ;
    }

    private processOneDir(cwd: string) : Promise<Map<string, string>> {
        let ret : Promise<Map<string, string>> = new Promise<Map<string, string>>((resolve, reject) => {
            //
            // There is no valid MTB_DEVICE value, so this means we don't have build
            // support.  We need to run 'make getlibs' to get build support.
            //
            mtbRunMakeGetLibs(this.context, cwd)
                .then((code: Number) => {
                    if (code === 0) {
                        runMakeGetAppInfo(cwd)
                            .then((makevars: Map<string, string>) => {
                                if (!makevars.has(ModusToolboxEnvVarNames.MTB_DEVICE) || makevars.get(ModusToolboxEnvVarNames.MTB_DEVICE)!.length === 0) {
                                    reject(new Error("The ModusToolbox application is not valid, MTB_DEVICE was not supplied")) ;
                                }
                                resolve(makevars) ;
                            })
                            .catch((err: Error) => {
                                reject(err) ;
                            }) ;
                    }
                    else {
                        let msg: string = "The operation 'make getlibs' failed with exit code " + code.toString() ;
                        reject(new Error(msg)) ;
                    }
                }) 
                .catch((err: Error) => {
                    reject(err) ;
                }) ;
        }) ;

        return ret ;
    }

    private processProject(makevars: Map<string, string>) : Promise<void> {
        let ret : Promise<void> = new Promise<void>((resolve, reject) => {
            //
            // We get here if we  have a valid build environment (e.g. MTB_DEVICE is defined)
            //
            let projobj = new MTBProjectInfo(this, path.basename(this.appDir)) ;
            this.projects.push(projobj) ;
            projobj.initProjectFromData(makevars)
                .then(() => {
                    this.processCommonAppStuff()
                        .then (() => {
                            resolve() ;
                        })
                        .catch((err : Error) => {
                            reject(err) ;
                        }) ;

                })
                .catch((err: Error) => {
                    reject(err) ;
                }) ;            
        }) ;

        return ret ;
    }

    //
    // Ok , we are processing a combined application and project.  We have the get_app_info
    // information for the directory, but if we don't have build support we need to run
    // make getlibs and then get the get_app_info information again.
    //
    private processCombined(makevars: Map<string, string>) : Promise<void> {
        let ret : Promise<void> = new Promise<void>((resolve, reject) => {
            if (!makevars.has(ModusToolboxEnvVarNames.MTB_DEVICE) || makevars.get(ModusToolboxEnvVarNames.MTB_DEVICE)!.length === 0) {
                this.processOneDir(this.appDir)
                    .then((data: Map<string, string>) => {
                        this.processProject(data)
                        .then(() => {
                            resolve() ;
                        })
                        .catch((err: Error) => {
                            reject(err) ;
                        }) ;  
                    })
                    .catch((err: Error) => {
                        reject(err) ;
                    }) ;  
            }
            else {
                this.processProject(makevars)
                    .then(() => {
                        resolve() ;
                    })
                    .catch((err: Error) => {
                        reject(err) ;
                    }) ;  
            }
        }) ;

        return ret ;
    }

    private finishOneProject(projdir: string, makedata: Map<string, string>) : Promise<void> {
        let ret : Promise<void> = new Promise<void>((resolve, reject) => {
            let projobj = new MTBProjectInfo(this, path.basename(projdir)) ;
            this.projects.push(projobj) ;
            projobj.initProjectFromData(makedata)
                .then(() => {
                    resolve() ;
                })
                .catch((err: Error) => {
                    reject(err) ;
                }) ; 
        }) ;

        return ret ;
    }

    private checkOneProject(projdir: string) : Promise<boolean> {
        let ret : Promise<boolean> = new Promise<boolean>((resolve, reject) => {
            runMakeGetAppInfo(projdir)
            .then((makevars: Map<string, string>) => {
                if (!makevars.has(ModusToolboxEnvVarNames.MTB_DEVICE) || makevars.get(ModusToolboxEnvVarNames.MTB_DEVICE)!.length === 0) {
                    resolve(true) ;
                }
                else {
                    resolve(false) ;
                }
            })
            .catch((err: Error) => {
                reject(err) ;
            }) ; 
        }) ;

        return ret ;
    }

    //
    // Process a multi-project application
    //
    private processMultiProject(makevars: Map<string, string>) : Promise<void> {
        let ret : Promise<void> = new Promise<void>((resolve, reject) => {
            let projstr = makevars.get(ModusToolboxEnvVarNames.MTB_PROJECTS) ;
            if (projstr === undefined) {
                let msg: string = "make get_app_info in directory '" + this.appDir + "' did not provide the value " ;
                msg += "'" + ModusToolboxEnvVarNames.MTB_PROJECTS + "'" ;
                reject(new Error(msg)) ;
            }
            else {
                let projects : string[] = projstr.split(" ") ;
                let promiseArray: Promise<boolean>[] = [];

                for (let project of projects) {
                    let prom: Promise<boolean> = this.checkOneProject(path.join(this.appDir, project)) ;
                    promiseArray.push(prom) ;
                }

                Promise.all(promiseArray).then((results) => {
                    let needGetLibs : boolean = false ;
                    for(let result of results) {
                        if (result) {
                            needGetLibs = true ;
                        }
                    }

                    if (needGetLibs) {
                        //
                        // Run getlibs at the application leve
                        //
                        mtbRunMakeGetLibs(this.context, this.appDir)
                            .then((code: number) => {
                                if (code === 0) {
                                    this.processCommonAppStuff()
                                    .then(() => {
                                        resolve() ;
                                    })
                                    .catch((err: Error) => {
                                        reject(err) ;
                                    }) ;
                                }
                                else {
                                    let msg: string = "the operation 'make getlibs' failed in directory '" + this.appDir + "' - exit code " + code.toString() ;
                                    reject(new Error(msg)) ;
                                }
                            })
                            .catch((err: Error) => {
                                reject(err) ;
                            }) ;
                    }
                    else {
                        this.processCommonAppStuff()
                            .then(() => {
                                resolve() ;
                            })
                            .catch((err: Error) => {
                                reject(err) ;
                            }) ;
                    }
                })
                .catch((err: Error) => {
                    reject(err) ;
                }) ;    
            }
        }) ;

        return ret ;
    }

    //
    // Load the application in the background
    //
    public initApp(appdir: string) : Promise<void> {
        this.appDir = appdir ;

        let ret : Promise<void> = new Promise<void>( (resolve, reject) => {
            this.checkAppType()
                .then ((info : [AppType, Map<string, string>]) => {
                    this.appType = info[0] ;
                    let value = info[1].get(ModusToolboxEnvVarNames.MTB_DEVICE) ;

                    if (info[1].has(ModusToolboxEnvVarNames.MTB_APP_NAME)) {
                        this.appName = info[1].get(ModusToolboxEnvVarNames.MTB_APP_NAME)! ;
                    } else {
                        if (info[1].has(ModusToolboxEnvVarNames.MTB_TYPE) && info[1].get(ModusToolboxEnvVarNames.MTB_TYPE) === ModusToolboxEnvTypeNames.APPLICATION) {
                            this.appName = path.basename(appdir) ;
                        }
                        else {
                            reject(new Error("this is not a valid ModusToolbox application, the application name was not provided")) ;
                        }
                    }
                    
                    if (info[0] === AppType.none) {
                        reject(new Error("this is not a ModusToolbox application")) ;
                    }
                    else if (info[0] === AppType.mtb2x) {
                        this.processCombined(info[1]).then(() => {
                            resolve() ;
                        })
                        .catch((err : Error) => {
                            reject(err) ;
                        }) ;
                    }   
                    else if (info[0] === AppType.combined) {
                        this.processCombined(info[1]).then(() => {
                            resolve() ;
                        })
                        .catch((err : Error) => {
                            reject(err) ;
                        }) ;
                    }   
                    else if (info[0] === AppType.multicore) {
                        this.processMultiProject(info[1]).then(() => {
                            resolve() ;
                        })
                        .catch((err : Error) => {
                            reject(err) ;
                        }) ;
                    }  
                })
                .catch((err: Error) => {
                    reject(err) ;
                }) ;
        }) ;
        return ret ;
    }

    static manifestLoadedCallback() {
        if (theModusToolboxApp) {
            theModusToolboxApp.updateAssets() ;
        }
    }

    private updateAssets() {
        for(let proj of this.projects) {
            proj.updateAssets() ;
        }
    }

    private setLaunchInfo(launch?: MTBLaunchInfo) {
        this.launch = launch ;

        if (launch) {
            //
            // If there is valid launch information, update the quick launch panel on
            // the left of the screen
            //
            getMTBProgramsTreeProvider().refresh(this.launch?.configs) ;
            getMTBDocumentationTreeProvider().refresh(this.launch?.docs) ;
        }
        else {
            //
            // There is no valid application and therefore not valid quick launch
            // information.  Reset the quick launch panels to their default values
            //
            getMTBProgramsTreeProvider().refresh(undefined) ;
            getMTBDocumentationTreeProvider().refresh(undefined) ;
        }
    }

    private mtbUpdateProgs() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            runMtbLaunch(this.appDir)
                .then ((jsonobj: any) => {
                    this.setLaunchInfo(new MTBLaunchInfo(jsonobj));
                    resolve() ;
                })
                .catch ((error) => {
                    reject(error) ;
                }) ;
            }) ;
        return ret ;
    }    

    //
    // Check for the .vscode directory and if it does not exist, run 
    // make vscode to create the vscode support needed.
    //
    private createVSCodeDirectory() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let vscodedir: string = path.join(this.appDir, ".vscode") ;
            fs.stat(vscodedir, (err, stats) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        //
                        // The .vscode directory does not exist, create it
                        //
                        runMakeVSCode(this.appDir)
                            .then( () => { 
                                this.reload = true ;
                                resolve() ;
                            })
                            .catch( (error) => { 
                                reject(error) ;
                            }) ;
                    }
                    else {
                        reject(err) ;
                    }
                }
                else 
                {
                    if (stats.isDirectory()) {
                        resolve() ;
                    }
                    else {
                        reject(new Error("the path '" + vscodedir + "' exists but is not a directory")) ;
                    }
                }
            }) ;
        }) ;
        return ret ;
    }
}

//
// Load a new application in as the ModusToolbox application being processed
//
export function mtbAssistLoadApp(context: vscode.ExtensionContext, appdir?: string) {
    if (appdir && theModusToolboxApp !== undefined && theModusToolboxApp.appDir === appdir && theModusToolboxApp.isLoading) {
        return ;
    }

    if (appdir) {
        theModusToolboxApp = new MTBAppInfo(context, appdir) ;
    } else {
        theModusToolboxApp = undefined ;
    }
}

export let theModusToolboxApp : MTBAppInfo | undefined = undefined ;
