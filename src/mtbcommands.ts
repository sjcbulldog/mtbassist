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

function dropEmptyLines(lines: string[]) : string [] {
    let ret: string[] = [] ;

    lines.forEach((line) => {
        if (line.length > 0) {
            ret.push(line) ;
        }
    }) ;

    return ret ;
}

function createProjects(output: Buffer) {
    let createout: string = output.toString() ;
    let lines: string[] = dropEmptyLines(createout.split("\r\n")) ;
    
    let projects : any[] = [] ;
    lines.forEach((line) => {
        let comps: string[] = line.split("|") ;
        if (comps[0] === "#PROJECT#") {
            let project = {
                name : comps[1],
                location: comps[2]
            } ;
            projects.push(project) ;
        }
    }) ;

    return projects ;
}

class ApplicationItem implements vscode.QuickPickItem {
    label: string ;
    description: string ;
    location: string ;

    constructor(label: string, description: string, location: string) {
        this.label = label ;
        this.description = description ;
        this.location = location ;
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

    let projects = createProjects(outstr) ;
    let projpath: string = "" ;

    if (projects.length === 1) {
        projpath = projects[0].location ;
        let uri = vscode.Uri.file(projects[0].location) ;
        vscode.commands.executeCommand('vscode.openFolder', uri) ;
    }
    else {
        const qp = vscode.window.createQuickPick<ApplicationItem>() ;
        qp.placeholder = "Multiple Applications Created - Select An Application" ;
        let items : ApplicationItem[] = [] ;
        projects.forEach((proj) => {
            let item: ApplicationItem = new ApplicationItem(proj.name, proj.location, proj.location) ;
            items.push(item) ;
        }) ;
        qp.items = items ;

        qp.onDidChangeSelection(selection => {
            let uri = vscode.Uri.file(selection[0].location) ;
            vscode.commands.executeCommand('vscode.openFolder', uri) ;
        }) ;

        qp.show() ;
    }
}