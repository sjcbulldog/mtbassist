import * as vscode from 'vscode';
import path = require("path");
import { mtbGetInfo, MTBInfo } from "./mtbinfo";
import exec = require("child_process") ;
import { MTBAssistCommand } from './mtbglobal';
import { MTBLaunchConfig, MTBLaunchDoc } from './mtblaunchdata';
import open = require("open") ;

export function mtbImportProject() {
}

export function mtbShowDoc(args?: any) {
    let typestr: string = typeof args ;

    let info : MTBInfo = mtbGetInfo() ;

    if (typestr === "object") {
        let docobj: MTBLaunchDoc = args as MTBLaunchDoc ;

        vscode.window.showInformationMessage("Showing document '" + docobj.title + "'") ;
        let fileuri: vscode.Uri = vscode.Uri.file(docobj.location) ;
        open(decodeURIComponent(fileuri.toString())) ;
    }    
}

export function mtbRunEditor(args?: any) {
    let typestr: string = typeof args ;

    let info : MTBInfo = mtbGetInfo() ;

    if (typestr === "object") {
        let cmdobj: MTBLaunchConfig = args as MTBLaunchConfig ;
        let cmdargs :string [] = [] ;

        for(let i = 0 ; i < cmdobj.cmdline.length ; i++) {
            if (i !== 0) {
                cmdargs.push(cmdobj.cmdline[i]) ;
            }
        }

        vscode.window.showInformationMessage("Starting program '" + cmdobj.shortName) ;

        exec.execFile(cmdobj.cmdline[0], 
            cmdargs, 
            { 
                cwd: info.appDir
            }, (error, stdout, stderr) => 
            {
                if (error) {
                    vscode.window.showErrorMessage(error.message) ;
                }
                console.error(`exec error: ${error}`);
                console.log(`stdout: ${stdout}`);
                console.error(`stderr: ${stderr}`);
            }
        );
    }
}

export function mtbCreateProject() {
    let info : MTBInfo = mtbGetInfo() ;
    let pcpath : string = path.join(info.toolsDir, "project-creator", "project-creator") ;


    if (process.platform === "win32") {
        pcpath += ".exe" ;
    }

    let outstr : Buffer ;
    try {
        outstr = exec.execFileSync(pcpath, ["--eclipse"]) ;
    }
    catch(error) {
        console.log("error: " + error) ;
        return ;
    }

    let newdir: string = outstr.toString() ;
    newdir = newdir.trim() ;
    let comps : string[] = newdir.split("|") ;

    if (comps[0] !== "#PROJECT#") {
        return ;
    }


    let uri = vscode.Uri.file(comps[2]) ;
    vscode.commands.executeCommand('vscode.openFolder', uri) ;
}