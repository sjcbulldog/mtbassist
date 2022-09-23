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

import path = require("path") ;
import exec = require("child_process") ;
import fs = require('fs');

import { getMTBDocumentationTreeProvider } from './mtbdoc';
import { getMTBProgramsTreeProvider } from './mtbglobal';
import { MessageType, mtbAssistExtensionInfo } from './mtbextinfo';
import { MTBLaunchInfo } from './mtblaunchdata';

export class MTBAppInfo
{
    public appDir: string ;
    public launch?: MTBLaunchInfo ;
    public isLoading: boolean ;
    public isValid: boolean ;

    constructor(appdir? : string) {
        this.appDir = "" ;
        this.setLaunchInfo(undefined) ;
        this.isValid = false ;
        this.isLoading = false ;

        this.initApp(appdir) ;
    }

    public initApp(appdir?: string) : Promise<void> {
        this.isLoading = true ;
        if (appdir) {
            this.appDir = appdir ;
        }

        let ret : Promise<void> = new Promise<void>( (resolve, reject) => {
            if (appdir) {
                this.checkModusToolboxApp()
                    .then( () => {
                        this.createVSCodeDirectory()
                            .then( () => {
                                this.mtbUpdateProgs()
                                    .then(() => {
                                        mtbAssistExtensionInfo.logMessage(MessageType.debug, "loaded ModusToolbox application '" + this.appDir + "'") ;
                                        this.isValid = true ;
                                        this.isLoading = false ;
                                        resolve() ;
                                    })
                                    .catch((error) => {
                                        this.isLoading = false ;
                                        reject(error) ;
                                    }) ;
                            })
                            .catch ((error) => {
                                this.isLoading = false ;
                                reject(error) ;
                            }) ;
                    })
                    .catch ((error) => {
                        this.isLoading = false ;
                        resolve(error) ;
                    }) ;
            }
            else {
                this.setLaunchInfo(undefined) ;
                resolve() ;
            }
        }) ;
        return ret ;
    }

    private setLaunchInfo(launch?: MTBLaunchInfo) {
        this.launch = launch ;

        getMTBProgramsTreeProvider().refresh(this.launch) ;
        getMTBDocumentationTreeProvider().refresh(this.launch) ;
    }

    private runMtbLaunch() : Promise<string> {
        let ret = new Promise<string>( (resolve, reject) => {
            let mtblaunch = path.join(mtbAssistExtensionInfo.toolsDir, "mtblaunch", "mtblaunch") ;
            if (process.platform === "win32") {
                mtblaunch += ".exe" ;
            }
            mtblaunch += " --quick --docs --app "  + this.appDir ;

            exec.exec(mtblaunch, { cwd: this.appDir, windowsHide: true }, (error, stdout, stderr) => {
                if (error) {
                    reject(error) ;
                }
        
                if (stderr) {
                    mtbAssistExtensionInfo.logMessage(MessageType.error, "mtblaunch: " + stderr) ;
                }

                resolve(stdout) ;
            }) ;
        }) ;

        return ret ;
    }

    private mtbUpdateProgs() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.runMtbLaunch()
                .then ((output: string) => {
                    this.setLaunchInfo(new MTBLaunchInfo(output));
                    resolve() ;
                })
                .catch ((error) => {
                    reject(error) ;
                }) ;
            }) ;
        return ret ;
    }    


    private runMakeVSCode() : Promise<void> {
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
            let makepath : string = path.join(mtbAssistExtensionInfo.toolsDir, "modus-shell", "bin", "bash") ;
            if (process.platform === "win32") {
                makepath += ".exe" ;
            }

            mtbAssistExtensionInfo.logMessage(MessageType.debug, "running ModusToolbox command '" + cmd + "' in directory '" + this.appDir + "'") ;
            exec.execFile(makepath, ["-c", 'PATH=/bin ; ' + cmd], { cwd: this.appDir }, (error, stdout, stderr) => {
                if (error) {
                    let errmsg : Error = error as Error ;
                    mtbAssistExtensionInfo.logMessage(MessageType.error, "running command '" + cmd + "' - " + errmsg.message) ;
                    reject(error) ;
                }

                if (stderr) {
                    let lines: string[] = stderr.split("\n") ;
                    mtbAssistExtensionInfo.logMessage(MessageType.error, "error output from running command '" + cmd + "'") ;
                    for(let i : number = 0 ; i < lines.length ; i++) {
                        let msg: string = i.toString() + ": " + lines[i] ;
                        mtbAssistExtensionInfo.logMessage(MessageType.error, msg) ;
                    }
                }

                resolve(stdout) ;
            }) ;
        }) ;

        return ret ;
    }
}

export function mtbAssistLoadApp(appdir?: string) {
    if (appdir && theModusToolboxApp.appDir === appdir && theModusToolboxApp.isLoading) {
        return ;
    }
    theModusToolboxApp = new MTBAppInfo(appdir) ;
}

export let theModusToolboxApp : MTBAppInfo = new MTBAppInfo(undefined) ;
