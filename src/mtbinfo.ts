import * as vscode from 'vscode';
import exec = require("child_process") ;
import path = require("path") ;
import fs = require('fs');
import json5 = require('json5') ;
import { MTBAssistDocumentProvider } from "./mtbdoc";
import { MTBAssistGlobalProvider } from "./mtbglobal";
import { MTBLaunchInfo } from "./mtblaunchdata";

const CY_TOOLS_DIR:string = "CY_TOOLS_DIR" ;
const CY_TOOLS_PATHS:string = "CY_TOOLS_PATHS" ;
const MTBASSIST_GLOBAL_STATE_VAR = "mtbassistant.project" ;

let pgms : MTBAssistGlobalProvider = new MTBAssistGlobalProvider() ;
let docs : MTBAssistDocumentProvider = new MTBAssistDocumentProvider() ;
let channel: vscode.OutputChannel = vscode.window.createOutputChannel("ModusToolbox") ;
let debugMode: boolean = true ;

export function getModusToolboxChannel() : vscode.OutputChannel {
    return channel ;
}

export function clearCreatedProjects(context: vscode.ExtensionContext) {
    context.globalState.update(MTBASSIST_GLOBAL_STATE_VAR, []) ;
}

export function addCreatedProject(context: vscode.ExtensionContext, projdir: string) {
    let normpath = path.normalize(projdir) ;
    let projs : string[] = context.globalState.get(MTBASSIST_GLOBAL_STATE_VAR) as string[] ;
    projs.push(normpath) ;
    context.globalState.update(MTBASSIST_GLOBAL_STATE_VAR, projs) ;
}

function comparePaths(p1: string, p2:string) : boolean {
    let ret: boolean = false ;

    if (process.platform === "win32") {
        if (p1.charAt(0).toLowerCase() !== p2.charAt(0).toLowerCase()) {
            ret = false ;
        }
        else {
            ret = p1.slice(1) === p2.slice(1) ;
        }
    }
    else {
        ret = (p1 === p2) ;
    }

    return ret ;
}

export function isCreatedProject(context: vscode.ExtensionContext, projdir: string) : boolean {
    let normpath = path.normalize(projdir) ;
    let projs : string[] = context.globalState.get(MTBASSIST_GLOBAL_STATE_VAR) as string[] ;
    let ret: boolean = false ;

    for(let i: number = 0 ; i < projs.length ; i++) {
        if (comparePaths(normpath, projs[i])) {
            ret = true ;
        }
    }
    return ret ;
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

    constructor() {
        this.toolsDir = "" ;
        this.appDir = "" ;
        this.inited = false ;
        this.launch = new MTBLaunchInfo("") ;
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
        ret = paths[0] ;
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

function runMakeVSCode(context: vscode.ExtensionContext, appdir: string) {
    clearCreatedProjects(context) ;
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
    }
}

export function initMtbInfo(context: vscode.ExtensionContext, appdir?: string) {
    info_.toolsDir = findToolsDir() ;
    info_.inited = true ;

    if (appdir) {
        let vscodedir: string = path.join(appdir, ".vscode") ;
        fs.stat(vscodedir, (err, stats) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    if (isCreatedProject(context, appdir)) {
                        runMakeVSCode(context, appdir!) ;
                    } else {
                        vscode.window
                            .showInformationMessage("This project has not been prepared for Visual Studio Code.  Do you want to run 'make vscode'?", "Yes", "No")
                            .then (answer => {
                                if (answer === "Yes") {
                                    runMakeVSCode(context, appdir!) ;
                                }
                            }) ;
                    }
                }
                else {
                    vscode.window.showInformationMessage("Cannot detect if this is an ModusToolbox Project") ;                    
                }
                return ;
            }
            else {
                findLaunchInfo(appdir!) ;
            }
        }) ;
    }
}

export function mtbGetInfo() : MTBInfo {
    if (info_.inited === false) {
        throw new Error("mtbGetInfo called before initMtbInfo") ;
    }
    return info_ ;   
}
