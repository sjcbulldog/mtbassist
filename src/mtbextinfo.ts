import * as vscode from 'vscode';
import exec = require("child_process") ;
import path = require("path") ;
import fs = require('fs');
import json5 = require('json5') ;

// const CY_TOOLS_DIR:string = "CY_TOOLS_DIR" ;
// const CY_TOOLS_PATHS:string = "CY_TOOLS_PATHS" ;
// const MTBASSIST_GLOBAL_STATE_VAR = "mtbassistant.project" ;

export enum MessageType
{
    debug,
    info,
    error
}

export class MTBExtensionInfo
{
    public toolsDir: string ;
    public docsDir: string ;
    public debugMode: boolean ;
    public channel: vscode.OutputChannel ;
    public isVersionOk: boolean ;

    constructor() {
        this.toolsDir = this.findToolsDir() ;
        this.docsDir = this.toolsDir.replace("tools_", "docs_") ;
        this.channel = vscode.window.createOutputChannel("ModusToolbox") ;

        if (process.env.MTBASSISTANT_DEBUG) {
            this.debugMode = true ;
        }
        else {
            this.debugMode = false ;
        }

        this.isVersionOk = this.checkModusToolboxVersion() ;

        this.logMessage(MessageType.debug, "ModusToolbox install directory: " + this.defaultInstallDir()) ;
        this.logMessage(MessageType.debug, "ModusToolbox tools directory:" + this.toolsDir) ;
        this.logMessage(MessageType.debug, "ModusToolbox docs directory: " + this.docsDir) ;
    }

    public showMessageWindow() {
        this.channel.show() ;
    }

    public logMessage(type: MessageType, message:string) {
        if (type !== MessageType.debug || this.debugMode) {
            let now : Date = new Date() ;
            let typestr: string = "" ;

            switch(type) {
                case MessageType.debug:
                    typestr = "Debug " ;
                    break ;

                case MessageType.error:
                    typestr = "Error " ;
                    break ;

                case MessageType.info:
                    typestr = "Info  " ;
                    break ;
            }

            let str: string = typestr + ": [" + now.toLocaleString() + "]: " + message ;
            this.channel.appendLine(str) ;
        }
    }

    private checkModusToolboxVersion() : boolean {
        let ret: boolean = true ;
    
        const verex = new RegExp(".*tools_([0-9]+)\\.([0-9]+)") ;
        const matches = verex.exec(this.toolsDir) ;
    
        if (matches && matches.length === 3) {
            let major: number = Number(matches[1]) ;
            let minor: number = Number(matches[2]) ;
    
            if (major < 3) {
                ret = false ;
            }
        }
        else {
            ret = false ;
        }
    
        return ret ;
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

export let mtbAssistExtensionInfo = new MTBExtensionInfo() ;
