//
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

export enum StatusType
{
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Ready,          // Everything is loaded and ready

    // eslint-disable-next-line @typescript-eslint/naming-convention    
    NotValid,       // Directory is not a valid ModusToolbox appliation

    // eslint-disable-next-line @typescript-eslint/naming-convention    
    Loading,        // Loading application and project information

    // eslint-disable-next-line @typescript-eslint/naming-convention
    GetLibs,        // Running 'make getlibs'
    
    // eslint-disable-next-line @typescript-eslint/naming-convention
    VSCode,         // Running 'make vscode'
}

export enum DocStatusType
{
    none,
    running,
    complete,
    error
}

export class MTBExtensionInfo
{
    static mtbAssistExtensionInfo : MTBExtensionInfo | undefined = undefined ;

    public static readonly debugModeName : string = "debugMode" ;
    public static readonly showWelcomePageName : string = "showWelcomePage" ;
    public static readonly version = vscode.extensions.getExtension('c-and-t-software.mtbassist')?.packageJSON.version ;

    private statusBarItem: vscode.StatusBarItem ;
    private status: StatusType ;
    private docstat: DocStatusType ;
    private intellisenseProject: string | undefined ;

    public toolsDir: string ;
    public docsDir: string ;
    public major: number ;
    public minor: number ;
    public channel: vscode.OutputChannel ;
    public manifestDb: MtbManifestDb ;
    
    context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.toolsDir = this.findDefaultToolsDir() ;
        this.docsDir = this.toolsDir.replace("tools_", "docs_") ;
        this.channel = vscode.window.createOutputChannel("ModusToolbox") ;
        this.context = context ;
        this.manifestDb = new MtbManifestDb() ;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100) ;

        this.logMessage(MessageType.info, "Starting ModusToolbox assistant") ;
        this.logMessage(MessageType.info, "ModusToolbox install directory: " + this.defaultInstallDir()) ;
        this.logMessage(MessageType.info, "ModusToolbox tools directory:" + this.toolsDir) ;
        this.logMessage(MessageType.info, "ModusToolbox docs directory: " + this.docsDir) ;

        this.major = -1 ;
        this.minor = -1 ;
        this.checkModusToolboxVersion() ;

        if (this.getPersistedBoolean(MTBExtensionInfo.debugModeName, false)) {
            this.logMessage(MessageType.debug, "Debug mode is enabled, you should see debug messages") ;
        }

        this.intellisenseProject = undefined ;
        this.status = StatusType.NotValid ;
        this.docstat = DocStatusType.none  ;
        this.statusBarItem.command = 'mtbassist.mtbSetIntellisenseProject';
    }

    public getIntellisenseProject() : string | undefined {
        return this.intellisenseProject ;
    }

    public setIntellisenseProject(project: string) {
        this.intellisenseProject = project ;
        this.updateStatusBar() ;
    }

    public updateToolsDir(dir: string) {
        this.toolsDir = dir ;
    }

    public setStatus(status: StatusType) {
        this.status = status ;
        this.updateStatusBar() ;
    }

    public setDocStatus(status: DocStatusType) {
        this.docstat = status ;
        this.updateStatusBar() ;
    }

    private updateStatusBar() {
        let st: string = "MTB:" ;
        let tip: string = "" ;

        switch(this.status) {
            case StatusType.GetLibs:
                st += " GetLibs" ;
                break ;
            case StatusType.Loading:
                st += " Loading" ;
                break ;
            case StatusType.NotValid:
                st += " NotValid" ;
                break ;
            case StatusType.Ready:
                st += " Ready" ;
                break ;
            case StatusType.VSCode:
                st += " Initializing" ;
                break ;
        }

        switch(this.docstat) {
            case DocStatusType.complete:
                st += "/C" ;
                tip += "Documentation: Info Loaded" ;
                break ;
            case DocStatusType.error:
                st += "/E" ;
                tip += "Documentation: Error" ;
                break ;
            case DocStatusType.running:
                st += "/R" ;
                tip += "Documentation: Loading ..." ;
                break ;
        }

        if (this.intellisenseProject) {
            st += " (" + this.intellisenseProject + ")" ;
            tip += "\nIntellisense: " + this.intellisenseProject ;
        }
        else {
            st += " (Click To Set)" ;
            tip += "\nIntellisense: " + "Click Here To Set Project" ;
        }

        this.statusBarItem.text = st ;
        this.statusBarItem.tooltip = tip ;
        this.statusBarItem.show() ;
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

    public getPersistedBoolean(name: string, def: boolean) : boolean {
        let ret: boolean = def ;

        if (this.context.globalState.keys().indexOf(name) !== -1) {
            let obj = this.context.globalState.get(name) ;
            if (typeof obj === "boolean") {
                ret = obj as boolean ;
            }
        }

        return ret ;
    }

    public setPersistedBoolean(name: string, value: boolean) {
        this.context.globalState.update(name, value) ;
    }

    public getPersistedString(name: string, def: string) : string {
        let ret: string = def ;

        if (this.context.globalState.keys().indexOf(name) !== -1) {
            let obj = this.context.globalState.get(name) ;
            if (typeof obj === "string") {
                ret = obj as string ;
            }
        }

        return ret ;
    }

    public setPersistedString(name: string, value: string) {
        this.context.globalState.update(name, value) ;
    }

    public showMessageWindow() {
        this.channel.show() ;
    }

    public logMessage(type: MessageType, message:string) {
        if (type !== MessageType.debug || this.getPersistedBoolean(MTBExtensionInfo.debugModeName, false)) {
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
    
    private findDefaultToolsDir() : string {
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
            console.log("Error, no ModusToolbox tools directory found") ;
        }
        else {
            ret = paths[paths.length - 1] ;
        }

        return ret ;
    }
}



