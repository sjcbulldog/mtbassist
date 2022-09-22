import * as vscode from 'vscode';
import exec = require("child_process") ;
import path = require("path") ;
import fs = require('fs');
import json5 = require('json5') ;
import { MTBAssistDocumentProvider } from "./mtbdoc";
import { MTBAssistGlobalProvider } from "./mtbglobal";
import { MTBLaunchInfo } from "./mtblaunchdata";
import { debug } from 'console';
import { addToRecentProjects } from './mtbrecent';

const CY_TOOLS_DIR:string = "CY_TOOLS_DIR" ;
const CY_TOOLS_PATHS:string = "CY_TOOLS_PATHS" ;
const MTBASSIST_GLOBAL_STATE_VAR = "mtbassistant.project" ;

let pgms : MTBAssistGlobalProvider = new MTBAssistGlobalProvider() ;
let docs : MTBAssistDocumentProvider = new MTBAssistDocumentProvider() ;
let channel: vscode.OutputChannel = vscode.window.createOutputChannel("ModusToolbox") ;
let debugMode: boolean = true ;

export function isDebugMode() : boolean {
    return debugMode ;
}

export function getDocsLocation(filename: string) {
    let info: MTBInfo = mtbGetInfo() ;

    let verstr = info.toolsDir.slice(info.toolsDir.length - 3, info.toolsDir.length) ;
    let docspath: string = path.join(path.dirname(info.toolsDir), "docs_" + verstr) ;
    return path.join(docspath, filename) ;
}

export function getModusToolboxChannel() : vscode.OutputChannel {
    return channel ;
}

export function getMTBProgramsTreeProvider() {
    return pgms ;
}

export function getMTBDocumentationTreeProvider() {
    return docs ;
}

export class MTBInfo
{
    public toolsDir: string ;
    public appDir: string ;
    public inited: boolean ;
    public launch: MTBLaunchInfo ;
    public isValidMTBProject: boolean ;

    constructor() {
        this.toolsDir = "" ;
        this.appDir = "" ;
        this.inited = false ;
        this.launch = new MTBLaunchInfo("") ;
        this.isValidMTBProject = false ;
    }
}

var info_: MTBInfo = new MTBInfo() ;

function defaultInstallDir() : string {
    let ret: string ;

    if (process.platform === "darwin") {
        ret = "/Applications/ModusToolbox" ;
    }
    else {
        ret =  path.join(require('os').homedir(), "ModusToolbox") ;
    }
    return ret ;
}

function findToolsDir() : string {
    let paths: string[] = [] ;
    let ret: string = "" ;

    if (process.env.CY_TOOLS_PATHS !== undefined) {
        paths = process.env.CY_TOOLS_PATHS!.split(" ") ;
    }
    else {
        const reg = new RegExp("tools_.*") ;
        let instpath: string = defaultInstallDir() ;
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

export function clearMtbInfoCache() {
    info_ = new MTBInfo() ;
}

function mtbUpdateProgs(launch: string ) {
    info_.launch = new MTBLaunchInfo(launch) ;

    pgms.refresh(info_) ;
    docs.refresh(info_) ;
}

function findLaunchInfo(appdir: string) {
    getModusToolboxChannel().appendLine("Running 'mtblaunch' to get project information") ;

    //
    // Now go get the mtblaunch information an populate the trees
    //
    info_.appDir = appdir! ;
    let mtblaunch = path.join(info_.toolsDir, "mtblaunch", "mtblaunch") ;
    if (process.platform === "win32") {
        mtblaunch += ".exe" ;
    }
    mtblaunch += " --quick --docs --app "  + info_.appDir ;

    exec.exec(mtblaunch, { cwd: info_.appDir, windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
            getModusToolboxChannel().appendLine("mtblaunch error: " + error) ;
        }

        if (stderr) {
            getModusToolboxChannel().appendLine("mtblaunch: stderr: " + stderr) ;
        }

        if (stdout) {
            if (debugMode) {
                getModusToolboxChannel().appendLine(stdout) ;
            }
            mtbUpdateProgs(stdout) ;
        }
    }) ;
}

export function runMakeVSCode(context: vscode.ExtensionContext, appdir: string) : boolean {
    let ret: boolean = true ;

    getModusToolboxChannel().appendLine("Running 'make vscode' to prepare directory") ;
    let makepath : string = path.join(info_.toolsDir, "modus-shell", "bin", "bash") ;
    if (process.platform === "win32") {
        makepath += ".exe" ;
    }
    
    try {
        exec.execFileSync(makepath, ["-c", 'PATH=/bin ; make vscode'], { cwd: appdir }) ;
        findLaunchInfo(appdir) ;
    }
    catch(error) {
        let errmgs: Error = error as Error ;
        getModusToolboxChannel().appendLine("Error running 'make vscode': " + errmgs.message) ;
        ret = false ;
    }

    return ret ;
}

export function checkModusToolboxVersion(context: vscode.ExtensionContext) : boolean {
    let ret: boolean = true ;

    initMtbInfo(context, undefined) ;

    const verex = new RegExp(".*tools_([0-9]+)\\.([0-9]+)") ;
    const matches = verex.exec(info_.toolsDir) ;

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

export function initMtbInfo(context: vscode.ExtensionContext) {
    info_.toolsDir = findToolsDir() ;
    info_.inited = true ;

    if (process.env.MTBASSISTANT_DEBUG) {
        debugMode = true ;
    }
    else {
        debugMode = false ;
    }
}

export function initMtbAppInfo(context: vscode.ExtensionContext, appdir: string) : Promise<void> {
    let ret = new Promise<void>( (resolve, reject) => {
        let vscodedir: string = path.join(appdir, ".vscode") ;
        fs.stat(vscodedir, (err, stats) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    vscode.window
                    .showInformationMessage("This project has not been prepared for Visual Studio Code.  Do you want to run 'make vscode'?", "Yes", "No")
                    .then (answer => {
                        if (answer === "Yes") {
                            if (!runMakeVSCode(context, appdir!)) {
                                return ;
                            }
                        }
                    }) ;
                }
            }
            else {

            }
            findLaunchInfo(appdir!) ;
            addToRecentProjects(context, appdir) ;
        }) ;
    }) ;

    return ret ;
}

export function mtbGetInfo() : MTBInfo {
    if (info_.inited === false) {
        throw new Error("mtbGetInfo called before initMtbInfo") ;
    }
    return info_ ;   
}
