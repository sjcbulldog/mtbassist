import * as vscode from 'vscode';
import exec = require("child_process") ;
import path = require("path") ;
import fs = require('fs');
import json5 = require('json5') ;
import { MTBAssistDocumentProvider } from "./mtbdoc";
import { MTBAssistGlobalProvider } from "./mtbglobal";
import { MTBLaunchInfo } from "./mtblaunchdata";
import { glob } from "glob";

const CY_TOOLS_DIR:string = "CY_TOOLS_DIR" ;
const CY_TOOLS_PATHS:string = "CY_TOOLS_PATHS" ;

let pgms : MTBAssistGlobalProvider = new MTBAssistGlobalProvider() ;
let docs : MTBAssistDocumentProvider = new MTBAssistDocumentProvider() ;

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
    vscode.window.showInformationMessage("Running 'mtblaunch' to get project information") ;

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
            console.log("mtblaunch error: " + error) ;
        }

        if (stderr) {
            console.log("mtblaunch: stderr: " + stderr) ;
        }

        if (stdout) {
            mtbUpdateProgs(stdout) ;
        }
    }) ;
}

function runMakeVSCode(appdir: string) {
    vscode.window.showInformationMessage("Running 'make vscode'") ;

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

export function initMtbInfo(appdir?: string) {
    info_.toolsDir = findToolsDir() ;
    info_.inited = true ;

    if (appdir) {
        let vscodedir: string = path.join(appdir, ".vscode") ;
        fs.stat(vscodedir, (err, stats) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    vscode.window
                        .showInformationMessage("This project has not been prepared for Visual Studio Code.  Do you want to run 'make vscode'?", "Yes", "No")
                        .then (answer => {
                            if (answer === "Yes") {
                                runMakeVSCode(appdir!) ;
                            }
                        }) ;
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
