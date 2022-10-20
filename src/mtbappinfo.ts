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
import * as exec from 'child_process' ;
import * as fs from 'fs' ;

import { getMTBDocumentationTreeProvider } from './mtbdocprovider';
import { getMTBProgramsTreeProvider } from './mtbprogramsprovider';
import { MessageType, MTBExtensionInfo } from './mtbextinfo';
import { MTBLaunchInfo } from './mtblaunchdata';
import { addToRecentProjects } from './mtbrecent';
import { refreshStartPage } from './mtbcommands';
import { mtbStringToJSON } from './mtbjson';
import { MTBAssetInstance } from './mtbassets';
import { ModusToolboxEnvVarNames } from './mtbnames';
import G = require('glob');
import { getMTBProjectInfoProvider } from './mtbprojinfoprovider';
import { getMTBAssetProvider } from './mtbassetprovider';

export class MTBAppInfo
{
    // The top level directory for the application
    public appDir: string ;

    // The launch information (configurators and documentation) for the application
    public launch?: MTBLaunchInfo ;

    // If true, the application is currently loading
    public isLoading: boolean ;

    // If true, the application is loaded and valid
    public isValid: boolean ;

    // The extension context
    public context: vscode.ExtensionContext ;
    
    // The shared directory
    public sharedDir?: string ;

    // The libs directory
    public libsDir?: string ;

    // The deps directory
    public depsDir?: string ;

    // The global directory
    public globalDir?: string ;

    // The list of assets
    public assets: MTBAssetInstance[] ;

    // The list of vars from the make get_app_info
    mtbvars: Map<string, string> = new Map<string, string>() ;

    static oldVarMap: Map<string, string> = new Map<string, string>() ;

    //
    // Create the application object and load in the background
    //
    constructor(context: vscode.ExtensionContext, appdir? : string) {
        this.appDir = "" ;
        this.sharedDir = undefined ;
        this.libsDir = undefined ;
        this.depsDir = undefined ;
        this.context = context ;
        this.assets = [] ;
        this.setLaunchInfo(undefined) ;

        MTBExtensionInfo.getMtbExtensionInfo().manifestDb.addLoadedCallback(MTBAppInfo.manifestLoadedCallback) ;

        if (MTBAppInfo.oldVarMap.size === 0) {
            MTBAppInfo.initOldVarMap() ;
        }

        this.isValid = false ;
        this.isLoading = true ;
        this.initApp(appdir)
            .then (()=> {
                this.isValid = true ;
                this.isLoading = false ;
                if (appdir) {
                    MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "loaded ModusToolbox application '" + this.appDir + "'") ;
                    vscode.window.showInformationMessage("ModusToolbox application loaded and ready") ;
                }
            })
            .catch((error) => {
                this.isValid = false ;
                this.isLoading = false ;
                MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "the application directory '" + appdir + "' is not a ModusToolbox application") ;
            }) ;
    }

    public getVar(varname: string) : string | undefined {
        return this.mtbvars.get(varname) ;
    }

    //
    // Load the application in the background
    //
    public initApp(appdir?: string) : Promise<void> {
        if (appdir) {
            this.appDir = appdir ;
            this.sharedDir = path.join(path.dirname(appdir), "mtb_shared") ;
            this.libsDir = path.join(appdir, "libs") ;
            this.depsDir = path.join(appdir, "deps") ;
        }

        let ret : Promise<void> = new Promise<void>( (resolve, reject) => {
            if (appdir) {
                //
                // Check to see if this is a ModusToolbox application by running
                // make get_app_info
                //
                this.checkModusToolboxApp()
                    .then( () => {
                        //
                        // If the .vscode directory does not exist, run make vscode
                        //
                        this.createVSCodeDirectory()
                            .then( () => {
                                //
                                // Run mtblaunch --quick --docs to get the information about
                                // relevant configurators and documentation
                                //
                                this.mtbUpdateProgs()
                                    .then(() => {
                                        //
                                        // Add this project to the recent projects list, and refresh the
                                        // ModusToolbox assistant welcome page if visible
                                        //
                                        addToRecentProjects(this.context, this.appDir) ;
                                        refreshStartPage() ;
                                        MTBAssetInstance.mtbLoadAssetInstance(this) ;
                                        resolve() ;
                                    })
                                    .catch((error) => {
                                        reject(error) ;
                                    }) ;
                            })
                            .catch ((error) => {
                                reject(error) ;
                            }) ;
                    })
                    .catch ((error) => {
                        //
                        // This is not a ModusToolbox application, reset the quick launch
                        // panel
                        //
                        this.setLaunchInfo(undefined) ;
                        reject(error) ;
                    }) ;
            }
            else {
                //
                // Called without an application directory, reset the quick launch
                // information to reflect now application
                //
                this.setLaunchInfo(undefined) ;
                resolve() ;
            }
        }) ;
        return ret ;
    }

    static manifestLoadedCallback() {
        if (theModusToolboxApp) {
            getMTBAssetProvider().refresh(theModusToolboxApp.assets) ;
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

    //
    // Run the mtb launch application and return the output when it is done.  The output is
    // json text.
    //
    private runMtbLaunch() : Promise<any> {
        let ret = new Promise<any>( (resolve, reject) => {
            let mtblaunch = path.join(MTBExtensionInfo.getMtbExtensionInfo().toolsDir, "mtblaunch", "mtblaunch") ;
            if (process.platform === "win32") {
                mtblaunch += ".exe" ;
            }
            mtblaunch += " --quick --docs --app "  + this.appDir ;

            exec.exec(mtblaunch, { cwd: this.appDir, windowsHide: true }, (error, stdout, stderr) => {
                if (error) {
                    reject(error) ;
                }
        
                if (stderr) {
                    MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "mtblaunch: " + stderr) ;
                }
                
                let obj = mtbStringToJSON(stdout) ;
                resolve(obj) ;
            }) ;
        }) ;

        return ret ;
    }

    private mtbUpdateProgs() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.runMtbLaunch()
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

    public runMakeVSCode() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.runModusCommandThroughShell("make vscode")
                .then ((output: string) => {
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
                        this.runMakeVSCode()
                            .then( () => { resolve() ;})
                            .catch( (error) => { reject(error) ;}) ;
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

    private processEnv(output: string) {
        let lines: string[] = output.split('\n') ;
        for(var line of lines) {
            let index = line.indexOf('=') ;
            if (index !== -1) {
                let name: string = line.substring(0, index) ;
                let value: string = line.substring(index + 1) ;
                if (MTBAppInfo.oldVarMap.has(name)) {
                    name = MTBAppInfo.oldVarMap.get(name) as string ;
                }

                if (name.startsWith("MTB_")) {
                    this.mtbvars.set(name, value) ;
                }

                if (this.mtbvars.has(ModusToolboxEnvVarNames.MTB_LIBS)) {
                    this.libsDir = this.mtbvars.get(ModusToolboxEnvVarNames.MTB_LIBS);
                }

                if (this.mtbvars.has(ModusToolboxEnvVarNames.MTB_GLOBAL_DIR)) {
                    this.globalDir = this.mtbvars.get(ModusToolboxEnvVarNames.MTB_GLOBAL_DIR) ;
                }

                if (this.mtbvars.has(ModusToolboxEnvVarNames.MTB_WKS_SHARED_DIR) && this.mtbvars.has(ModusToolboxEnvVarNames.MTB_WKS_SHARED_NAME)) {
                    let shdir: string = this.mtbvars.get(ModusToolboxEnvVarNames.MTB_WKS_SHARED_DIR) as string ;
                    let shname: string = this.mtbvars.get(ModusToolboxEnvVarNames.MTB_WKS_SHARED_NAME) as string ;
                    this.sharedDir = path.join(shdir, shname) ;
                }
            }
        }
    }

    //
    // Run make get_app_info and check the output for errors.  If there are errors
    // assume this is not a ModusToolbox directory and reject the Promise halting
    // any further processing of the current folder as a ModusToolbox application.
    //
    private checkModusToolboxApp() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.runModusCommandThroughShell("make get_app_info")
                .then ((output: string) => {
                    if (output.indexOf("No rule") === -1) {
                        this.processEnv(output) ;
                        getMTBProjectInfoProvider().refresh() ;
                        resolve() ;
                    }
                    else {
                        let err : Error = new Error("the directory '" + this.appDir + "' is not a ModusToolbox applicatgion") ;
                        reject(err) ;
                    }
                })
                .catch ((error) => {
                    reject(error) ;
                }) ;
        }) ;
        return ret ;
    }

    //
    // This runs a command using the modus shell.  If any output appears on standard error, it is output
    // to the log window
    //
    // Args:
    //   cmd - the command to run
    //   
    // Returns:
    //    the output from running the command
    //
    public runModusCommandThroughShell(cmd: string) : Promise<string> {
        let ret : Promise<string> = new Promise<string>( (resolve, reject) => {
            let makepath : string = path.join(MTBExtensionInfo.getMtbExtensionInfo().toolsDir, "modus-shell", "bin", "bash") ;
            if (process.platform === "win32") {
                makepath += ".exe" ;
            }

            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "running ModusToolbox command '" + cmd + "' in directory '" + this.appDir + "'") ;
            let cmdstr: string ;
            if (process.platform === 'win32') {
                cmdstr = "PATH=/bin:/usr/bin ; " + cmd ;
            }
            else {
                cmdstr = cmd ;
            }
            
            exec.execFile(makepath, ["-c", cmdstr], { cwd: this.appDir }, (error, stdout, stderr) => {
                if (error) {
                    let errmsg : Error = error as Error ;
                    MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "running command '" + cmd + "' - " + errmsg.message) ;
                    reject(error) ;
                }

                if (stderr) {
                    let lines: string[] = stderr.split("\n") ;
                    MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "error output from running command '" + cmd + "'") ;
                    for(let i : number = 0 ; i < lines.length ; i++) {
                        if (lines[i].length > 0) {
                            let msg: string = (i + 1).toString() + ": " + lines[i] ;
                            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, msg) ;
                        }
                    }
                }

                resolve(stdout) ;
            }) ;
        }) ;

        return ret ;
    }

    static initOldVarMap() {
        MTBAppInfo.oldVarMap.set("TARGET_DEVICE", ModusToolboxEnvVarNames.MTB_DEVICE);
        MTBAppInfo.oldVarMap.set("TOOLCHAIN", ModusToolboxEnvVarNames.MTB_TOOLCHAIN);
        MTBAppInfo.oldVarMap.set("TARGET", ModusToolboxEnvVarNames.MTB_TARGET);
        MTBAppInfo.oldVarMap.set("COMPONENTS", ModusToolboxEnvVarNames.MTB_COMPONENTS);
        MTBAppInfo.oldVarMap.set("DISABLE_COMPONENTS", ModusToolboxEnvVarNames.MTB_DISABLED_COMPONENTS);
        MTBAppInfo.oldVarMap.set("ADDITIONAL_DEVICES", ModusToolboxEnvVarNames.MTB_ADDITIONAL_DEVICES);
        MTBAppInfo.oldVarMap.set("CY_GETLIBS_PATH", ModusToolboxEnvVarNames.MTB_LIBS);
        MTBAppInfo.oldVarMap.set("CY_GETLIBS_DEPS_PATH", ModusToolboxEnvVarNames.MTB_DEPS);
        MTBAppInfo.oldVarMap.set("CY_GETLIBS_SHARED_NAME", ModusToolboxEnvVarNames.MTB_WKS_SHARED_NAME);
        MTBAppInfo.oldVarMap.set("CY_GETLIBS_SHARED_PATH", ModusToolboxEnvVarNames.MTB_WKS_SHARED_DIR);
        MTBAppInfo.oldVarMap.set("CY_TOOLS_PATH", ModusToolboxEnvVarNames.MTB_TOOLS_DIR);
        MTBAppInfo.oldVarMap.set("APP_NAME", ModusToolboxEnvVarNames.MTB_APP_NAME);
        MTBAppInfo.oldVarMap.set("CY_GETLIBS_CACHE_PATH", ModusToolboxEnvVarNames.MTB_CACHE_DIR);
        MTBAppInfo.oldVarMap.set("CY_GETLIBS_OFFLINE_PATH", ModusToolboxEnvVarNames.MTB_OFFLINE_DIR);
        MTBAppInfo.oldVarMap.set("CY_GETLIBS_GLOBAL_PATH", ModusToolboxEnvVarNames.MTB_GLOBAL_DIR);
    }
}

//
// Load a new application in as the ModusToolbox application being processed
//
export function mtbAssistLoadApp(context: vscode.ExtensionContext, appdir?: string) {
    if (appdir && theModusToolboxApp !== undefined && theModusToolboxApp.appDir === appdir && theModusToolboxApp.isLoading) {
        return ;
    }
    theModusToolboxApp = new MTBAppInfo(context, appdir) ;
}

export let theModusToolboxApp : MTBAppInfo | undefined = undefined ;
