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
import { MTBDevKitMgr } from './mtbdevicekits';
import { mtbShowWelcomePage } from './mtbcommands';
import { RecentAppManager } from './mtbrecent';

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

    public static readonly ninjaModeName : string = "ninjaMode" ;
    public static readonly debugModeName : string = "debugMode" ;
    public static readonly readmeName : string = "readmeOnOff" ;
    public static readonly showWelcomePageName : string = "showWelcomePage" ;
    public static version: string = "" ;

    private statusBarItem: vscode.StatusBarItem ;
    private status: StatusType ;
    private docstat: DocStatusType ;
    private intellisenseProject: string | undefined ;

    private devKitMgr: MTBDevKitMgr | undefined = undefined ;
    private recentAppMgr: RecentAppManager | undefined = undefined ;

    public toolsDir: string ;
    public docsDir: string ;
    public major: number ;
    public minor: number ;
    public channel: vscode.OutputChannel ;
    public manifestDb: MtbManifestDb | undefined ;
    public hasClangD: boolean ;
    public isNinjaValid: boolean ;
   
    context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        let ext = vscode.extensions.getExtension('c-and-t-software.mtbassist');
        if (!ext)
        {
            throw new Error("interal error, could not get extension info for mtbassist extension") ;
        }

        MTBExtensionInfo.version = ext!.packageJSON.version ;       
        this.toolsDir = this.findDefaultToolsDir() ;
        this.docsDir = this.toolsDir.replace("tools_", "docs_") ;
        this.channel = vscode.window.createOutputChannel("ModusToolbox") ;
        this.context = context ;

        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100) ;

        this.logMessage(MessageType.info, "Starting ModusToolbox assistant") ;
        this.logMessage(MessageType.info, "ModusToolbox install directory: " + this.defaultInstallDir()) ;
        this.logMessage(MessageType.info, "ModusToolbox tools directory:" + this.toolsDir) ;
        this.logMessage(MessageType.info, "ModusToolbox docs directory: " + this.docsDir) ;

        let clangd = vscode.extensions.getExtension("llvm-vs-code-extensions.vscode-clangd") ;
        if (clangd === undefined) {
            this.hasClangD = false ;
            this.logMessage(MessageType.info, "CLANGD extension not installed.") ;
            vscode.window.showInformationMessage("The ModusToolbox Assistant will manage intellisense to provide an optimal experience, " + 
                "but this only works with the 'clangd' extension.  It is highly recommended the that 'clangd' extension also be installed.") ;
        } else {
            this.hasClangD = true ;
        }

        vscode.extensions.onDidChange((ev) => {
            this.extensionListChanged(ev) ;
        });

        this.major = -1 ;
        this.minor = -1 ;
        this.checkModusToolboxVersion() ;

        if (this.getPersistedBoolean(MTBExtensionInfo.debugModeName, false)) {
            this.logMessage(MessageType.debug, "Debug mode is enabled, you should see debug messages") ;
            this.showMessageWindow() ;
        }

        if (this.getPersistedBoolean(MTBExtensionInfo.ninjaModeName, false)) {
            this.logMessage(MessageType.debug, "Experimental NINJA build mode is enabled.") ;
            this.isNinjaValid = true ;
        }
        else {
            this.isNinjaValid = false ;
        }

        this.intellisenseProject = undefined ;
        this.status = StatusType.NotValid ;
        this.docstat = DocStatusType.none  ;

        this.statusBarItem.command = 'mtbassist.mtbSetIntellisenseProject';

        if (this.isModusToolboxValid) {
            this.manifestDb = new MtbManifestDb() ;
        }
    }

    public checkMTBVersion(major: number, minor: number) {
        if (this.major > major || (this.major === major && this.minor >= minor)) {
            return true ;
        }

        return false ;
    }

    public setNinajSupport(valid: boolean) {
        if(valid && this.checkMTBVersion(3,3)) {
            this.isNinjaValid = true ;
        }
        else {
            this.isNinjaValid = false ;
        }
    }

    public loadManifestData() {
        this.manifestDb!.loadManifestData() ;
    }

    public get isModusToolboxValid() : boolean {
        return this.major >= 3 ;
    }

    public getDevKitMgr() : MTBDevKitMgr {
        return this.devKitMgr! ;
    }

    public getRecentAppMgr() : RecentAppManager {
        if (this.recentAppMgr === undefined) {
            this.recentAppMgr = new RecentAppManager() ;
        }
        return this.recentAppMgr ;
    }    

    private async loadDevKits(mgr: MTBDevKitMgr) : Promise<void> {
        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
            mgr.scanForDevKits()
                .then((status) => {
                    if (status) {
                        if (mgr.needsUpgrade()) {
                            let opts = {
                                detail: "Select yes to upgrade all attached development kits to the latest firmware",
                                modal: true
                            } ;
                            vscode.window.showInformationMessage('There are ModusToolbox supported kits with out of date firmware. Would you like to see the development kits attached?', opts, "Yes")
                                .then((ans) => {
                                    if (ans === "Yes") {
                                        mtbShowWelcomePage(MTBExtensionInfo.getMtbExtensionInfo().context, 3);
                                    }
                                }) ;
                        }
                        resolve() ;
                    }
                    else {
                        reject(new Error("could not create dev kit manager")) ;
                    }
                })
                .catch((err) => {
                    reject(err) ;
                });
        }) ;

        return ret;
    }

    private extensionListChanged(ev: any) {
        let clangd = vscode.extensions.getExtension("llvm-vs-code-extensions.vscode-clangd") ;

        if (this.hasClangD && clangd === undefined) {
            // Clang was uninstalled
            this.hasClangD = false ;
            vscode.window.showInformationMessage("The 'clangd' extension was uninstalled or disabled.  Intellisense will no longer be managed by the ModusToolbox Assistant extension.");
        }
        else if (!this.hasClangD && clangd) {
            // Clang was installed
            this.hasClangD = true ;
            vscode.window.showInformationMessage("The 'clangd' extension was installed.  Intellisense will be managed by the ModusToolbox Assistant.") ;            
        }
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

        if (this.intellisenseProject) {
            st += " (" + this.intellisenseProject + ")" ;
            tip += "\nIntellisense: " + this.intellisenseProject ;
        }
        else {
            if (this.status === StatusType.Ready) {
                st += " (Click To Set)" ;
            }
            tip += "\nIntellisense: " + "Click Here To Set Project" ;
        }

        this.statusBarItem.text = st ;
        this.statusBarItem.tooltip = tip ;
        this.statusBarItem.show() ;
    }

    private initDevKitMgr() {      
        let mgr: MTBDevKitMgr = new MTBDevKitMgr() ;
        this.devKitMgr = mgr ;         
        this.loadDevKits(mgr)
        .then((mgr) => {
            this.logMessage(MessageType.debug, "sucessfully created devkit manager") ;
        })
        .catch((err) => {
            let errobj: Error = err as Error ;
            this.logMessage(MessageType.debug, "could not create devkit manager - " + errobj.message) ;
        }) ;
    }

    public static initExtension(context: vscode.ExtensionContext) {
        if (context === undefined) {
            throw new Error("mtbassist initialization error, the context must be set when creating the extension info object") ;
        }
        else {
            this.mtbAssistExtensionInfo = new MTBExtensionInfo(context) ;
            if (this.mtbAssistExtensionInfo.isModusToolboxValid) {
                //
                // Only probe dev kits if we are in a valid ModusToolbox environment. Otherwise, we don't know
                // how the fw loader that we use may behave.
                //
                this.mtbAssistExtensionInfo.initDevKitMgr() ;
            }
        }
    }

    public static getMtbExtensionInfo() : MTBExtensionInfo {
        if (this.mtbAssistExtensionInfo === undefined) {
            throw new Error("invalid initialization sequence - initExtension() should be called before getMtbExtensionInfo()") ;
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



