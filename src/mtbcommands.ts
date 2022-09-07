import * as vscode from 'vscode';
import path = require("path");
import { mtbGetInfo, MTBInfo } from "./mtbinfo";
import exec = require("child_process") ;
import { MTBAssistCommand } from './mtbglobal';
import { MTBLaunchConfig } from './mtblaunchdata';

export function mtbImportProject() {
}

export function mtbRunEditor(args?: any) {
    let typestr: string = typeof args ;

    let info : MTBInfo = mtbGetInfo() ;

    if (typestr === "object") {
        let cmdobj: MTBLaunchConfig = args as MTBLaunchConfig ;
        let cmdargs :string [] = [] ;

        for(let i = 1 ; i < cmdobj.cmdline.length ; i++) {
            cmdargs.push(cmdobj.cmdline[i]) ;
        }
        exec.execFile(cmdobj.cmdline[0], 
            cmdargs, 
            { 
                cwd: info.appDir, 
                windowsHide: true,
                windowsVerbatimArguments: true
            }, (error, stdout, stderr) => 
            {
                if (error) {
                console.error(`exec error: ${error}`);
                return;
                }
                console.log(`stdout: ${stdout}`);
                console.error(`stderr: ${stderr}`);
            }
        );
    }
}

export function mtbCreateProject() {
    let info : MTBInfo = mtbGetInfo() ;
    let pcpath : string = path.join(info.toolsDir, "project-creator", "project-creator") ;
    let makepath : string = path.join(info.toolsDir, "modus-shell", "bin", "bash") ;

    if (process.platform === "win32") {
        pcpath += ".exe" ;
        makepath += ".exe" ;
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

    let channel = vscode.window.createOutputChannel("ModusToolbox") ;
    try {
        outstr = exec.execFileSync(makepath, ["-c", 'PATH=/bin ; make vscode'], { cwd: comps[2] }) ;
    }
    catch(error) {
        if (typeof error === "string") {
            channel.appendLine(<string>error) ;
        }
        return ;
    }

    let uri = vscode.Uri.file(comps[2]) ;
    vscode.commands.executeCommand('vscode.openFolder', uri) ;
    channel.appendLine(outstr.toString()) ;
}