//
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

import * as vscode from 'vscode';
import exec = require("child_process") ;
import path = require("path") ;
import fs = require('fs');
import { MtbManifestDb } from './manifest/mtbmanifestdb';

export enum MessageType
{
    debug,
    info,
    warning,
    error
}

export class MTBExtensionInfo
{
    static mtbAssistExtensionInfo : MTBExtensionInfo | undefined = undefined ;

    public static readonly debugModeName : string = "debugMode" ;
    public static readonly showWelcomePageName : string = "showWelcomePage" ;
    public static readonly version = "1.0.13" ;

    public toolsDir: string ;
    public docsDir: string ;
    public major: number ;
    public minor: number ;
    public channel: vscode.OutputChannel ;
    public manifestDb: MtbManifestDb ;

    context: vscode.ExtensionContext;


    constructor(context: vscode.ExtensionContext) {
        this.toolsDir = this.findToolsDir() ;
        this.docsDir = this.toolsDir.replace("tools_", "docs_") ;
        this.channel = vscode.window.createOutputChannel("ModusToolbox") ;
        this.context = context ;
        this.manifestDb = new MtbManifestDb() ;

        this.logMessage(MessageType.info, "Starting ModusToolbox assistant") ;
        this.logMessage(MessageType.info, "ModusToolbox install directory: " + this.defaultInstallDir()) ;
        this.logMessage(MessageType.info, "ModusToolbox tools directory:" + this.toolsDir) ;
        this.logMessage(MessageType.info, "ModusToolbox docs directory: " + this.docsDir) ;

        this.major = -1 ;
        this.minor = -1 ;
        this.checkModusToolboxVersion() ;

        if (this.getPresistedBoolean(MTBExtensionInfo.debugModeName, false)) {
            this.logMessage(MessageType.debug, "Debug mode is enabled, you should see debug messages") ;
        }
    }

    public static getMtbExtensionInfo(context?: vscode.ExtensionContext) : MTBExtensionInfo {
        if (this.mtbAssistExtensionInfo === undefined) {
            if (context === undefined) {
                throw new Error("mtbassist initialization error, the context must be set when creating the extension info object") ;
            }
            else {
                this.mtbAssistExtensionInfo = new MTBExtensionInfo(context) ;
            }
        }

        return this.mtbAssistExtensionInfo ;
    }

    public getPresistedBoolean(name: string, def: boolean) : boolean {
        let ret: boolean = def ;

        if (this.context.globalState.keys().indexOf(name) !== -1) {
            let obj = this.context.globalState.get(name) ;
            if (typeof obj === "boolean") {
                ret = obj as boolean ;
            }
        }

        return ret ;
    }

    public setPresistedBoolean(name: string, value: boolean) {
        this.context.globalState.update(name, value) ;
    }

    public showMessageWindow() {
        this.channel.show() ;
    }

    public logMessage(type: MessageType, message:string) {
        if (type !== MessageType.debug || this.getPresistedBoolean(MTBExtensionInfo.debugModeName, false)) {
            let now : Date = new Date() ;
            let typestr: string = "" ;

            switch(type) {
                case MessageType.debug:
                    typestr = "Debug   " ;
                    break ;

                case MessageType.error:
                    typestr = "Error   " ;
                    break ;

                case MessageType.info:
                    typestr = "Info    " ;
                    break ;

                case MessageType.warning:
                    typestr = "Warning " ;
                    break ;                    
            }

            let str: string = typestr + ": [" + now.toLocaleString() + "]: " + message ;
            this.channel.appendLine(str) ;
        }
    }

    private checkModusToolboxVersion() {
        const verex = new RegExp(".*tools_([0-9]+)\\.([0-9]+)") ;
        const matches = verex.exec(this.toolsDir) ;
    
        if (matches && matches.length === 3) {
            this.major = Number(matches[1]) ;
            this.minor = Number(matches[2]) ;
        }
    }

    private defaultInstallDir() : string {
        let ret: string ;
    
        if (process.platform === "darwin") {
            ret = "/Applications/ModusToolbox" ;
        }
        else {
            ret =  path.join(require('os').homedir(), "ModusToolbox") ;
        }
        return ret ;
    }
    
    private findToolsDir() : string {
        let paths: string[] = [] ;
        let ret: string = "" ;

        if (process.env.CY_TOOLS_PATHS !== undefined) {
            paths = process.env.CY_TOOLS_PATHS!.split(" ") ;
        }
        else {
            const reg = new RegExp("tools_.*") ;
            let instpath: string = this.defaultInstallDir() ;
            let files = fs.readdirSync(instpath) ;
            files.forEach(function (file) {
                if (reg.test(file)) {
                    paths.push(path.join(instpath, file)) ;
                }
            }) ;
        }

        paths = paths.sort() ;
        if (paths.length === 0) {
            console.log("Error, not ModusToolbox tools directory found") ;
        }
        else {
            ret = paths[paths.length - 1] ;
        }

        return ret ;
    }
}



