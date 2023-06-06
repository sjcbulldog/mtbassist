//
// Copyright 2022 by C And T Software
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

//
// This file implements all of the commands that are registered by the
// ModusToolbox Assistant extension.
//

import * as vscode from 'vscode';
import * as path from 'path' ;
import * as fs from 'fs' ;
import * as open from 'open' ;
import * as exec from 'child_process' ;
import * as os from 'os' ;

import { MTBLaunchConfig, MTBLaunchDoc } from './mtblaunchdata';
import { getImportHtmlInstructions, getModusToolboxAssistantStartupHtml } from './mtbgenhtml';
import { MessageType, MTBExtensionInfo } from './mtbextinfo';
import { mtbAssistLoadApp, theModusToolboxApp } from './mtbapp/mtbappinfo';
import { checkRecent, removeRecent } from './mtbrecent';
import { MTBAssetInstance } from './mtbapp/mtbassets';

function outputLines(context: vscode.ExtensionContext, data: string) {
    let str: string = data.toString().replace(/\r\n/g, "\n") ;
    let lines: string[] = str.split("\n") ;
    for(let line of lines) {
        line = line.trim() ;
        if (line.length > 0) {
            MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.info, line) ;
        }
    }
}

export function mtbRunMakeGetLibs(context: vscode.ExtensionContext, cwd: string) : Promise<number> {
    let ret: Promise<number> = new Promise<number>((resolve, reject) => {
        let makepath : string = path.join(MTBExtensionInfo.getMtbExtensionInfo(context).toolsDir, "modus-shell", "bin", "bash") ;
        MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.info, "mtbImportProject: running 'make getlibs' in directory '" + cwd + "' ...") ;
        let cmd = "make getlibs" ;
        let job = exec.spawn(makepath, ["-c", 'PATH=/bin:/usr/bin ; ' + cmd], { cwd: cwd }) ;

        job.stdout.on(('data'), (data: Buffer) => {
            outputLines(context, data.toString()) ;
        }) ;

        job.stderr.on(('data'), (data: string) => {
            outputLines(context, data.toString()) ;
        }) ;

        job.on('close', (code: number) => {
            resolve(code) ;
        }) ;
    }) ;

    return ret ;
}


function mtbRunMakeVscode(context: vscode.ExtensionContext, cwd: string) : Promise<number> {
    let ret: Promise<number> = new Promise<number>((resolve, reject) => {
        let makepath : string = path.join(MTBExtensionInfo.getMtbExtensionInfo(context).toolsDir, "modus-shell", "bin", "bash") ;
        MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.info, "mtbImportProject: running 'make getlibs' in directory '" + cwd + "' ...") ;
        let cmd = "make vscode" ;
        let job = exec.spawn(makepath, ["-c", 'PATH=/bin:/usr/bin ; ' + cmd], { cwd: cwd }) ;

        job.stdout.on(('data'), (data: Buffer) => {
            outputLines(context, data.toString()) ;
        }) ;

        job.stderr.on(('data'), (data: string) => {
            outputLines(context, data.toString()) ;
        }) ;

        job.on('close', (code: number) => {
            resolve(code) ;
        }) ;
    }) ;

    return ret ;
}

function mtbRunGetLibsVSCode(context: vscode.ExtensionContext, cwd: string) : Promise<void> {
    let ret: Promise<void> = new Promise<void>((resolve, reject) => {
        mtbRunMakeGetLibs(context, cwd)
            .then((code) => {
                if (code === 0) {
                    mtbRunMakeVscode(context, cwd)
                        .then((code) => {
                            if (code === 0) {
                                let uri: vscode.Uri = vscode.Uri.file(cwd) ;
                                vscode.commands.executeCommand("vscode.openFolder", uri) ;
                                resolve() ;
                            }
                            else {
                                reject(new Error("the command 'make vscode' failed")) ;
                            }
                        })
                        .catch((err: Error) => {
                            reject(err) ;
                        }) ;
                }
                else {
                    reject(new Error("the command 'make getlibs' failed")) ;
                }
            })
            .catch((err: Error) => {
                reject(err) ;
            }) ;
    }) ;

    return ret ;
}

function mtbImportProjectWithLoc(context: vscode.ExtensionContext, locdir: string, gitpath: string, name: string) {
    let makepath : string = path.join(MTBExtensionInfo.getMtbExtensionInfo(context).toolsDir, "modus-shell", "bin", "bash") ;

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

    MTBExtensionInfo.getMtbExtensionInfo(context).showMessageWindow() ;
    MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.info, "mtbImportProject: cloning from from '" + gitpath + "' to location '" + finalpath + "' ... ") ;

    let cmd = "git clone " + gitpath + " " + name ;
    let job = exec.spawn(makepath, ["-c", 'PATH=/bin:/usr/bin ; ' + cmd], { cwd: locdir }) ;

    job.stdout.on(('data'), (data: string) => {
        let str: string = data.toString().replace(/\r\n/g, "\n") ;
        MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.info, str) ;
    }) ;

    job.stderr.on(('data'), (data: string) => {
        let str: string = data.toString().replace(/\r\n/g, "\n") ;
        MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.info, str) ;
    }) ;

    job.on('close', (code: number) => {
        if (code === 0) {
            mtbRunGetLibsVSCode(context, finalpath)
                .then(() => {

                })
                .catch((err: Error) => {
                    let msg: string = "mtbImportProject: failed in directory '" + finalpath + "' - " + err.message ;
                    vscode.window.showErrorMessage(msg) ;
                    MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.error, msg) ;                                        
                }) ;
        }
        else {
            let msg: string = "mtbImportProject: cloning from from '" + gitpath + "' to location '" + finalpath + "' ... failed" ;
            vscode.window.showErrorMessage(msg) ;
            MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.error, msg) ;            
        }
    }) ;
}

export function mtbImportProject(context: vscode.ExtensionContext) {
    
    if (theModusToolboxApp !== undefined && theModusToolboxApp.isLoading) {
        MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.error, "you must wait for the current ModusToolbox application to finish loading") ;
        vscode.window.showErrorMessage("You must wait for the current ModusToolbox application to finish loading") ;
        return ;
    }

    		// Display a web page about ModusToolbox
	let panel : vscode.WebviewPanel = vscode.window.createWebviewPanel(
        'mtbassist', 
        'ModusToolbox', 
        vscode.ViewColumn.One, 
            {
                enableScripts: true
            }
       ) ;

    panel.webview.html = getImportHtmlInstructions() ;

    panel.webview.onDidReceiveMessage( (message)=> {
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "recevied import page command '" + message.command + "'") ;
        if (message.command === "mtbImportProjectDirect") {
            vscode.commands.executeCommand('mtbassist.mtbImportProjectDirect') ;
        }
    }) ;
}

export function mtbImportProjectDirect(context: vscode.ExtensionContext) {

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

export function mtbShowDoc(context: vscode.ExtensionContext, args?: any) {
    let typestr: string = typeof args ;

    if (typestr === "object") {
        let docobj: MTBLaunchDoc = args as MTBLaunchDoc ;

        vscode.window.showInformationMessage("Showing document '" + docobj.title + "'") ;
        let fileuri: vscode.Uri = vscode.Uri.file(docobj.location) ;
        open(decodeURIComponent(fileuri.toString())) ;
    }    
}

export function mtbRunEditor(context: vscode.ExtensionContext, args?: any) {
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

                if (vscode.workspace.workspaceFolders) {
                    let appdir : string = vscode.workspace.workspaceFolders[0].uri.fsPath;
                    mtbAssistLoadApp(context, appdir) ;
                }
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

function createProjects3x(output: Buffer) {
    let projdata = JSON.parse(output.toString()) ;
    let projects: any[] = [] ;
    projdata.projects.forEach((proj: any) => {
        if (proj.status === "success") {
            let project = {
                name: proj.name,
                location: proj.location
            } ;
            projects.push(project);
        }
    }) ;

    return projects ;
}

function createProjects30(output: Buffer) {
    let createout: string = output.toString() ;
    let lines: string[] = dropEmptyLines(createout.split("\r\n")) ;
    
    let projects : any[] = [] ;
    lines.forEach((line) => {
        line = line.trim() ;
        let comps: string[] = line.split("|") ;
        if (comps[0] === "#PROJECT#") {
            let projloc = comps[2] ;

            if (projloc.length > 1 && projloc[0] === '~') {
                projloc = projloc.replace('~', os.homedir()) ;
            }

            let project = {
                name : comps[1],
                location: projloc
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

function canRunModusCommand(context: vscode.ExtensionContext) : boolean {
    let ret: boolean = true ;

    if (theModusToolboxApp === undefined) {
        MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.error, "there is not ModusToolbox application loaded") ;
        vscode.window.showErrorMessage("You must load a ModusToolbox application for this command to work") ;
        ret = false ;
    }
    else if (theModusToolboxApp !== undefined && theModusToolboxApp.isLoading) {
        MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.error, "you must wait for the current ModusToolbox application to finish loading") ;
        vscode.window.showErrorMessage("You must wait for the current ModusToolbox application to finish loading") ;
        ret = false ;
    }
    else if (theModusToolboxApp.isValid === false) {
        MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.error, "there was an error loading the ModusToolbox application") ;
        vscode.window.showErrorMessage("There was an error loading the ModusToolbox application") ;
        ret = false ;
    }

    return ret ;
}

let panel: vscode.WebviewPanel | undefined ;

export function refreshStartPage() {
    if (panel !== undefined) {
        panel.webview.html = getModusToolboxAssistantStartupHtml() ;
    }
}

function getPanel() : vscode.WebviewPanel {
    if (panel === undefined) {
        panel = vscode.window.createWebviewPanel(
             'mtbassist', 
             'ModusToolbox', 
             vscode.ViewColumn.One, 
             {
                 enableScripts: true
             }
        ) ;
    }
    panel.webview.html = getModusToolboxAssistantStartupHtml() ;
    return panel ;
}

export function mtbShowWelcomePage(context: vscode.ExtensionContext) {
    panel = getPanel() ;

    panel.onDidDispose(()=> {
        panel = undefined ;
    }) ;

    panel.webview.onDidReceiveMessage( (message)=> {
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "recevied startup page command '" + message.command + "'") ;
        if (message.command === "logMessage") {
            let msg: string = message.message as string ;
            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, msg) ;
        }
        else if (message.command === "createNew") {
            vscode.commands.executeCommand("mtbassist.mtbCreateProject") ;
        }
        else if (message.command === "importExisting") {
            vscode.commands.executeCommand("mtbassist.mtbImportProject") ;
        }
        else if (message.command === "importExistingDisk") {
            vscode.commands.executeCommand("mtbassist.mtbImportDiskProject") ;
        }
        else if (message.command === "showModusToolbox") {
            vscode.commands.executeCommand("mtbglobal.focus") ;
        }
        else if (message.command === "showUserGuide") {
            let docpath: string = path.join(MTBExtensionInfo.getMtbExtensionInfo(context).docsDir, "mtb_user_guide.pdf") ;
            let fileuri = vscode.Uri.file(docpath) ;
            open(decodeURIComponent(fileuri.toString())) ;
        }
        else if (message.command === "showWelcomePage") {
            MTBExtensionInfo.getMtbExtensionInfo().setPresistedBoolean(MTBExtensionInfo.showWelcomePageName, true) ;
        }
        else if (message.command === "mtbImportProjectDirect") {
            vscode.commands.executeCommand('mtbassist.mtbImportProjectDirect') ;
        }
        else if (message.command === "hideWelcomePage") {
            MTBExtensionInfo.getMtbExtensionInfo().setPresistedBoolean(MTBExtensionInfo.showWelcomePageName, false) ;
        }
        else if (message.command === "showReleaseNotes") {
            let docpath: string = path.join(MTBExtensionInfo.getMtbExtensionInfo(context).docsDir, "mt_release_notes.pdf") ;
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

export function mtbRunLibraryManager(context: vscode.ExtensionContext) {
    if (canRunModusCommand(context) === true) {
        let ran: boolean = false ;
        if (theModusToolboxApp?.launch) {
            for(const config of theModusToolboxApp.launch.configs) {
                if (config.shortName === "library-manager") {
                    vscode.commands.executeCommand("mtbassist.mtbRunEditor", config) ;
                    ran = true ;
                    break ;
                }
            }
        }

        if (ran === false) {
            vscode.window.showErrorMessage("Cannot find the tools of type 'library-manager' in the tool list") ;
        }
    }    
}

export function mtbRunMakeGetLibsCmd(context: vscode.ExtensionContext) {
    if (theModusToolboxApp !== undefined && theModusToolboxApp.isLoading) {
        MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.error, "you must wait for the current ModusToolbox application to finish loading") ;
        vscode.window.showErrorMessage("You must wait for the current ModusToolbox application to finish loading") ;
        return ;
    }
    if (theModusToolboxApp) {
        MTBExtensionInfo.getMtbExtensionInfo().showMessageWindow() ;
        
        mtbRunMakeGetLibs(context, theModusToolboxApp.appDir)
            .then((code: number) => {
                theModusToolboxApp!.needVSCode = true ;
                if (code) {
                    let msg: string = "'make getlibs' failed with exit status " + code.toString() ;
                    vscode.window.showErrorMessage(msg) ;
                    MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.error, msg) ;
                }
                else {
                    vscode.window.showInformationMessage("'make getlibs' completed sucessfully, reloading application") ;
                    if (vscode.workspace.workspaceFolders) {
                        let appdir : string = vscode.workspace.workspaceFolders[0].uri.fsPath;
                        mtbAssistLoadApp(context, appdir) ;
                    }
                }
            })
            .catch((err: Error) => {
                let msg: string = "'make getlibs' failed - " + err.message ;
                vscode.window.showErrorMessage(msg) ;
                MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.error, msg) ;
            }) ;
        }
}

export function mtbCreateProject(context: vscode.ExtensionContext) {
    if (theModusToolboxApp !== undefined && theModusToolboxApp.isLoading) {
        MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.error, "you must wait for the current ModusToolbox application to finish loading") ;
        vscode.window.showErrorMessage("You must wait for the current ModusToolbox application to finish loading") ;
        return ;
    }
    
    let pcpath : string = path.join(MTBExtensionInfo.getMtbExtensionInfo(context).toolsDir, "project-creator", "project-creator") ;
    
    if (process.platform === "win32") {
        pcpath += ".exe" ;
    }

    let post30: boolean = false ;
    let outstr : Buffer ;
    try {
        let major: number = MTBExtensionInfo.getMtbExtensionInfo(context).major ;
        let minor: number = MTBExtensionInfo.getMtbExtensionInfo(context).minor ;

        if (major > 3 || minor > 0) {
            outstr = exec.execFileSync(pcpath, ["--machine-interface", "--ide", "vscode", "--ide-readonly", "--close"]) ;
            post30 = true ;
        }
        else {
            outstr = exec.execFileSync(pcpath, ["--eclipse", "--ideVersion", "3.0"]) ;
        }
    }
    catch(error) {
        console.log("error: " + error) ;
        return ;
    }

    MTBExtensionInfo.getMtbExtensionInfo(context).showMessageWindow() ;
    MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.info, "reading ModusToolbox application state, please wait ...") ;

    let projects : any[] ;
    
    if (post30) {
        projects = createProjects3x(outstr) ;
    } else {
        projects = createProjects30(outstr) ;
    }
    
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
    MTBExtensionInfo.getMtbExtensionInfo().setPresistedBoolean(MTBExtensionInfo.debugModeName, true) ;
}

export function mtbTurnOffDebugMode(context: vscode.ExtensionContext) {
    MTBExtensionInfo.getMtbExtensionInfo().setPresistedBoolean(MTBExtensionInfo.debugModeName, false) ;
}

export function mtbSymbolDoc(editor: vscode.TextEditor, edit: vscode.TextEditorEdit, context: vscode.ExtensionContext) {
    if (vscode.window.activeTextEditor) {
        let uri: vscode.Uri = editor.document.uri ;
        let pos: vscode.Position = editor.selection.active ;
        vscode.commands.executeCommand("vscode.executeDefinitionProvider", uri, pos)
            .then(value => {
                let locs : vscode.Location[] = value as vscode.Location[] ;
                if (locs.length > 0) {
                    let asset: MTBAssetInstance|undefined = MTBAssetInstance.mtbPathToInstance(locs[0].uri.fsPath) ;
                    if (asset) {
                        asset.displayDocs() ;
                    }
                    else {
                        vscode.window.showInformationMessage("Symbol under cursors is not part of an asset") ;
                    }
                }
                else {
                    vscode.window.showInformationMessage("Symbol under cursors is not part of an asset") ;
                }
            }) ;
    }
}
