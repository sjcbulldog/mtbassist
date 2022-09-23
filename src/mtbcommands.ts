//
// Copyright 2022 by Apollo Software
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
import path = require("path");
import fs = require('fs') ;
import exec = require("child_process") ;
import { MTBLaunchConfig, MTBLaunchDoc } from './mtblaunchdata';
import open = require("open") ;
import { getModusToolboxAssistantStartupHtml } from './mtbstart';
import { MessageType, mtbAssistExtensionInfo } from './mtbextinfo';
import { mtbAssistLoadApp, theModusToolboxApp } from './mtbappinfo';
import { checkRecent, removeRecent } from './mtbrecent';



function mtbImportProjectWithLoc(context: vscode.ExtensionContext, locdir: string, gitpath: string, name: string) {
    let makepath : string = path.join(mtbAssistExtensionInfo.toolsDir, "modus-shell", "bin", "bash") ;

    let st = fs.statSync(locdir) ;
    if (!st) {
        vscode.window.showErrorMessage("The path '" + locdir + "' does not exist") ;
        return ;
    }

    if (!st.isDirectory) {
        vscode.window.showErrorMessage("The path '" + locdir + "' exists but is not a directory") ;
        return ;        
    }

    if (process.platform === "win32") {
        makepath += ".exe" ;
    }

    let finalpath: string = path.join(locdir, name) ;

    mtbAssistExtensionInfo.showMessageWindow() ;
    mtbAssistExtensionInfo.logMessage(MessageType.info, "mtbImportProject: cloning from from '" + gitpath + "' to location '" + finalpath + "' ... ") ;

    let cmd = "git clone " + gitpath + " " + name ;
    let job = exec.spawn(makepath, ["-c", 'PATH=/bin ; ' + cmd], { cwd: locdir }) ;

    job.stdout.on(('data'), (data: string) => {
        let str: string = data.toString().replace("\r\n", "\n") ;
        mtbAssistExtensionInfo.logMessage(MessageType.info, str) ;
    }) ;

    job.stderr.on(('data'), (data: string) => {
        let str: string = data.toString().replace("\r\n", "\n") ;
        mtbAssistExtensionInfo.logMessage(MessageType.info, str) ;
    }) ;

    job.on('close', (code: number) => {
        if (code === 0) {
            mtbAssistExtensionInfo.logMessage(MessageType.info, "mtbImportProject: running 'make getlibs' in directory '" + finalpath + "' ...") ;
            cmd = "make getlibs" ;
            job = exec.spawn(makepath, ["-c", 'PATH=/bin ; ' + cmd], { cwd: finalpath }) ;

            job.stdout.on(('data'), (data: Buffer) => {
                let str: string = data.toString().replace("\r\n", "\n") ;
                mtbAssistExtensionInfo.logMessage(MessageType.info, str) ;
            }) ;
        
            job.stderr.on(('data'), (data: string) => {
                let str: string = data.toString().replace("\r\n", "\n") ;
                mtbAssistExtensionInfo.logMessage(MessageType.info, str) ;
            }) ;

            job.on('close', (code: number) => {
                if (code === 0) {
                    mtbAssistExtensionInfo.logMessage(MessageType.info, "mtbImportProject: running 'make vscode' in directory '" + finalpath + "' ...") ;
                    cmd = "make vscode" ;
                    job = exec.spawn(makepath, ["-c", 'PATH=/bin ; ' + cmd], { cwd: finalpath }) ;

                    job.stdout.on(('data'), (data: string) => {
                        let str: string = data.toString().replace("\r\n", "\n") ;
                        mtbAssistExtensionInfo.logMessage(MessageType.info, str) ;
                    }) ;
                
                    job.stderr.on(('data'), (data: string) => {
                        let str: string = data.toString().replace("\r\n", "\n") ;
                        mtbAssistExtensionInfo.logMessage(MessageType.info, str) ;
                    }) ;
                    
                    job.on('close', (code: number) => {
                        if (code === 0) {
                            let uri = vscode.Uri.file(finalpath) ;
                            vscode.commands.executeCommand('vscode.openFolder', uri) ;
                        }
                        else {
                            mtbAssistExtensionInfo.logMessage(MessageType.error, "mtbImportProject: running 'make vscode' in directory '" + finalpath + "' ... failed") ;
                        }
                    }) ;
                }
                else {
                    mtbAssistExtensionInfo.logMessage(MessageType.error, "mtbImportProject: running 'make getlibs' in directory '" + finalpath + "' ... failed") ;                    
                }
            }) ;
        }
        else {
            mtbAssistExtensionInfo.logMessage(MessageType.error, "mtbImportProject: cloning from from '" + gitpath + "' to location '" + finalpath + "' ... failed") ;            
        }
    }) ;
}

export function mtbImportProject(context: vscode.ExtensionContext) {
    
    if (theModusToolboxApp !== undefined && theModusToolboxApp.isLoading) {
        mtbAssistExtensionInfo.logMessage(MessageType.error, "you must wait for the current ModusToolbox application to finish loading") ;
        vscode.window.showErrorMessage("You must wait for the current ModusToolbox application to finish loading") ;
        return ;
    }

    vscode.window.showOpenDialog({
        defaultUri: vscode.Uri.file("C:/cygwin64/home/butch/mtbprojects/temp"),
        canSelectFiles : false,
        canSelectFolders: true,
        canSelectMany: false })
        .then( (folder) => {
            if (folder) {
                let folderarray : vscode.Uri[] = folder as vscode.Uri[] ;
                let destdir: string = folderarray[0].fsPath ;

                vscode.window.showInputBox({
                        prompt : "Git Repo Location",
                        title: "Import Project From Git Repo",
                        placeHolder : "Enter location of git repo",
                        value: "https://github.com/sjcbulldog/mtbhelloworld.git"
                    })
                    .then( (gitloc) => {
                        if (gitloc) {
                            vscode.window.showInputBox({
                                prompt : "Name of the project",
                                title: "Import Project From Git Repo",
                                placeHolder : "Name of the project in target directory",
                                value: "MyNewProject"
                            }).then((name) => {
                                if (name) {
                                    mtbImportProjectWithLoc(context, destdir, gitloc!, name!) ;
                                }
                            }) ;
                        }
                    }) ;
            }
        }) ;
}

export function mtbShowDoc(args?: any) {
    let typestr: string = typeof args ;

    if (typestr === "object") {
        let docobj: MTBLaunchDoc = args as MTBLaunchDoc ;

        vscode.window.showInformationMessage("Showing document '" + docobj.title + "'") ;
        let fileuri: vscode.Uri = vscode.Uri.file(docobj.location) ;
        open(decodeURIComponent(fileuri.toString())) ;
    }    
}

export function mtbRunEditor(args?: any) {
    let typestr: string = typeof args ;

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
                cwd: theModusToolboxApp?.appDir
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

let panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
    'mtbassist', 
    'ModusToolbox', 
    vscode.ViewColumn.One, 
    {
        enableScripts: true
    }
) ;

export function refreshStartPage() {
    panel.webview.html = getModusToolboxAssistantStartupHtml() ;
}

export function mtbShowWelcomePage(context: vscode.ExtensionContext) {
    panel.webview.html = getModusToolboxAssistantStartupHtml() ;

    panel.webview.onDidReceiveMessage( (message)=> {
        console.log("Help me") ;
        if (message.command === "createNew") {
            vscode.commands.executeCommand("mtbassist.mtbCreateProject") ;
        }
        else if (message.command === "importExisting") {
            vscode.commands.executeCommand("mtbassist.mtbImportProject") ;
        }
        else if (message.command === "showModusToolbox") {
            vscode.commands.executeCommand("mtbglobal.focus") ;
        }
        else if (message.command === "showUserGuide") {
            let docpath: string = path.join(mtbAssistExtensionInfo.docsDir, "mtb_user_guide.pdf") ;
            let fileuri = vscode.Uri.file(docpath) ;
            open(decodeURIComponent(fileuri.toString())) ;
        }
        else if (message.command === "showReleaseNotes") {
            let docpath: string = path.join(mtbAssistExtensionInfo.docsDir, "mt_release_notes.pdf") ;
            let fileuri = vscode.Uri.file(docpath) ;
            open(decodeURIComponent(fileuri.toString())) ;
        }
        else if (message.command === "openRecent") {
            let appdir: string = message.projdir ;

            if (checkRecent(appdir)) {
                let uri = vscode.Uri.file(appdir) ;
                vscode.commands.executeCommand('vscode.openFolder', uri) ;
            } else {
                vscode.window.showInformationMessage("The application '" + appdir + "' does not exist.  Remove it from the recent list?", "Yes", "No")
                    .then((answer) => {
                        if (answer === "Yes") {
                            removeRecent(context, appdir) ;
                            refreshStartPage() ;
                        }
                }) ;
            }
        }
    }) ;    
}

export function mtbCreateProject(context: vscode.ExtensionContext) {
    if (theModusToolboxApp !== undefined && theModusToolboxApp.isLoading) {
        mtbAssistExtensionInfo.logMessage(MessageType.error, "you must wait for the current ModusToolbox application to finish loading") ;
        vscode.window.showErrorMessage("You must wait for the current ModusToolbox application to finish loading") ;
        return ;
    }
    
    let pcpath : string = path.join(mtbAssistExtensionInfo.toolsDir, "project-creator", "project-creator") ;
    
    if (process.platform === "win32") {
        pcpath += ".exe" ;
    }

    let outstr : Buffer ;
    try {
        outstr = exec.execFileSync(pcpath, ["--eclipse", "--ideVersion", "3.0"]) ;
    }
    catch(error) {
        console.log("error: " + error) ;
        return ;
    }

    mtbAssistExtensionInfo.showMessageWindow() ;
    mtbAssistExtensionInfo.logMessage(MessageType.info, "reading ModusToolbox application state, please wait ...") ;

    let projects = createProjects(outstr) ;
    let projpath: string = "" ;

    if (projects.length === 0) {
        vscode.window.showErrorMessage("No projects created by ModusToolbox") ;
    }
    else if (projects.length === 1) {
        projpath = projects[0].location ;
        let uri = vscode.Uri.file(projpath) ;
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

export function mtbTurnOnDebugMode(context: vscode.ExtensionContext) {
    mtbAssistExtensionInfo.debugMode = true ;
}

export function mtbTurnOffDebugMode(context: vscode.ExtensionContext) {
    mtbAssistExtensionInfo.debugMode = false ;
}