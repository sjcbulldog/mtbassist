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
import path = require("path") ;
import exec = require("child_process") ;
import fs = require('fs');

import { getMTBDocumentationTreeProvider } from './mtbdoc';
import { getMTBProgramsTreeProvider } from './mtbglobal';
import { MessageType, MTBExtensionInfo } from './mtbextinfo';
import { MTBLaunchInfo } from './mtblaunchdata';
import { addToRecentProjects } from './mtbrecent';
import { refreshStartPage } from './mtbcommands';
import { mtbStringToJSON } from './mtbjson';

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

    //
    // Create the application object and load in the background
    //
    constructor(context: vscode.ExtensionContext, appdir? : string) {
        this.appDir = "" ;
        this.context = context ;
        this.setLaunchInfo(undefined) ;

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

    //
    // Load the application in the background
    //
    public initApp(appdir?: string) : Promise<void> {

        if (appdir) {
            this.appDir = appdir ;
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
            exec.execFile(makepath, ["-c", 'PATH=/bin ; ' + cmd], { cwd: this.appDir }, (error, stdout, stderr) => {
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
