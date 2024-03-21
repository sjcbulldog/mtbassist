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

//
// This file implements all of the commands that are registered by the
// ModusToolbox Assistant extension.
//

import * as vscode from 'vscode';
import * as path from 'path' ;
import * as fs from 'fs' ;
import * as exec from 'child_process' ;
import * as os from 'os' ;

import { MTBLaunchConfig, MTBLaunchDoc } from './mtblaunchdata';
import { getModusToolboxAssistantHTMLPage } from './mtbgenhtml';
import { MessageType, MTBExtensionInfo, StatusType } from './mtbextinfo';
import { mtbAssistLoadApp, getModusToolboxApp, MTBAppInfo } from './mtbapp/mtbappinfo';
import { MTBAssetInstance } from './mtbapp/mtbassets';
import { browseropen } from './browseropen';
import { MTBDevKitMgr } from './mtbdevicekits';
import { RecentAppManager } from './mtbrecent';

function outputLines(context: vscode.ExtensionContext, data: string) {
    let str: string = data.toString().replace(/\r\n/g, "\n") ;
    let lines: string[] = str.split("\n") ;
    for(let line of lines) {
        line = line.trim() ;
        if (line.length > 0) {
            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, line) ;
        }
    }
}

export async function mtbResultDecode(context: vscode.ExtensionContext) {
    const value = await vscode.window.showInputBox({
        placeHolder: "Enter result code",
        prompt: "Enter result code as a legal 'C' integer"
    }) ;

    vscode.window.showInformationMessage("Text '" + value + "'") ;
}

export function mtbRunMakeGetLibs(context: vscode.ExtensionContext, cwd: string) : Promise<number> {
    MTBExtensionInfo.getMtbExtensionInfo().setStatus(StatusType.GetLibs) ;
    let ret: Promise<number> = new Promise<number>((resolve, reject) => {
        let makepath : string = path.join(MTBExtensionInfo.getMtbExtensionInfo().toolsDir, "modus-shell", "bin", "bash") ;
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "ModusToolbox: running 'make getlibs' in directory '" + cwd + "' ...") ;
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

export function mtbShowDoc(context: vscode.ExtensionContext, args?: any) {
    let typestr: string = typeof args ;

    if (typestr === "object") {
        let docobj: MTBLaunchDoc = args as MTBLaunchDoc ;
        browseropen(docobj.location) ;
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
                cwd: getModusToolboxApp()?.appDir
            }, (error, stdout, stderr) => 
            {
                if (error) {
                    vscode.window.showErrorMessage(error.message) ;
                }
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
    let projdata: any ;

    try {
        projdata = JSON.parse(output.toString()) ;
    }
    catch(err) {
        let msg: string =  "Output from ModusToolbox project creator is not valid.  Check ModusToolbox installation." ;
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, msg);
        vscode.window.showErrorMessage(msg);        
    }

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

    if (getModusToolboxApp() === undefined) {
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "there is no ModusToolbox application loaded") ;
        vscode.window.showErrorMessage("You must load a ModusToolbox application for this command to work") ;
        ret = false ;
    }
    else if (getModusToolboxApp() !== undefined && getModusToolboxApp()!.isLoading) {
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "you must wait for the current ModusToolbox application to finish loading") ;
        vscode.window.showErrorMessage("You must wait for the current ModusToolbox application to finish loading") ;
        ret = false ;
    }
    else if (getModusToolboxApp()!.isValid === false) {
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "there was an error loading the ModusToolbox application") ;
        vscode.window.showErrorMessage("There was an error loading the ModusToolbox application") ;
        ret = false ;
    }

    return ret ;
}

let panel: vscode.WebviewPanel | undefined ;

function refreshStartPage() {
    if (panel !== undefined) {
        panel.webview.html = getModusToolboxAssistantHTMLPage(panel.webview, 'welcome.html', 0) ;
    }
}

function refreshStartPageForKits() {
    refreshStartPageWithPage(3);
}

function refreshStartPageWithPage(tab: number) {
    if (panel !== undefined) {
        panel.webview.html = getModusToolboxAssistantHTMLPage(panel.webview, 'welcome.html', tab) ;
    }
}

function getPanel(page: string, context: vscode.ExtensionContext, tab: number | undefined) : vscode.WebviewPanel {
    if (panel === undefined) {
        let jspath: vscode.Uri =  vscode.Uri.joinPath(context.extensionUri, 'content', 'js') ;
        let csspath: vscode.Uri =  vscode.Uri.joinPath(context.extensionUri, 'content', 'css') ;
        panel = vscode.window.createWebviewPanel(
             'mtbassist', 
             'ModusToolbox', 
             vscode.ViewColumn.One, 
             {
                enableScripts: true,
                localResourceRoots: [ jspath, csspath ]
             }
        ) ;
    }

    panel.webview.html = getModusToolboxAssistantHTMLPage(panel.webview, page, tab);
    return panel ;
}

export function mtbShowWelcomePage(context: vscode.ExtensionContext, tab: number | undefined) {
    panel = getPanel("welcome.html", context, tab) ;

    let kitmgr: MTBDevKitMgr = MTBExtensionInfo.getMtbExtensionInfo().getDevKitMgr() ;
    kitmgr.addKitsChangedCallback(refreshStartPageForKits);

    let recentmgr: RecentAppManager = MTBExtensionInfo.getMtbExtensionInfo().getRecentAppMgr() ;
    recentmgr.addChangedCallback(refreshStartPage);

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
        else if (message.command === "showModusToolbox") {
            vscode.commands.executeCommand("mtbglobal.focus") ;
        }
        else if (message.command === "showUserGuide") {
            let docpath: string = path.join(MTBExtensionInfo.getMtbExtensionInfo().docsDir, "mtb_user_guide.pdf") ;
            browseropen(docpath) ;
        }
        else if (message.command === "showVSCodeGuide") {
            let docpath: string = path.join(MTBExtensionInfo.getMtbExtensionInfo().docsDir, "mt_vscode_user_guide.pdf") ;
            if (fs.existsSync(docpath)) {
                browseropen(docpath) ;
            }
            else {
                vscode.window.showErrorMessage("The 'Visual Studio Code For ModusToolbox users guide' does not exist in the current verison of ModusToolbox.");
            }
        }
        else if (message.command === "showWelcomePage") {
            MTBExtensionInfo.getMtbExtensionInfo().setPersistedBoolean(MTBExtensionInfo.showWelcomePageName, true) ;
        }
        else if (message.command === "hideWelcomePage") {
            MTBExtensionInfo.getMtbExtensionInfo().setPersistedBoolean(MTBExtensionInfo.showWelcomePageName, false) ;
        }
        else if (message.command === "showReleaseNotes") {
            let docpath: string = path.join(MTBExtensionInfo.getMtbExtensionInfo().docsDir, "mt_release_notes.pdf") ;
            browseropen(decodeURIComponent(docpath)) ;
        }
        else if (message.command === "refreshKits") {
            vscode.commands.executeCommand('mtbassist.mtbRefreshDevKits');
        }
        else if (message.command === "updatefirmware") {
            MTBExtensionInfo.getMtbExtensionInfo().getDevKitMgr().updateFirmware(message.serial) ;
        }
        else if (message.command === "updateallfirmware") {
            MTBExtensionInfo.getMtbExtensionInfo().getDevKitMgr().updateAllFirmware() ;
        }
        else if (message.command === "openRecent") {
            let appdir: string = message.projdir ;

            if (RecentAppManager.checkRecent(appdir)) {
                let uri = vscode.Uri.file(appdir) ;
                vscode.commands.executeCommand('vscode.openFolder', uri) ;
            } else {
                vscode.window.showInformationMessage("The application '" + appdir + "' does not exist.  Remove it from the recent list?", "Yes", "No")
                    .then((answer) => {
                        if (answer === "Yes") {
                            MTBExtensionInfo.getMtbExtensionInfo().getRecentAppMgr().removeRecent(context, appdir) ;
                            let extinfo = MTBExtensionInfo.getMtbExtensionInfo() ;
                            if (extinfo && extinfo.context) {
                                refreshStartPage() ;
                            }
                        }
                }) ;
            }
        }
    }) ;    
}

export function mtbRunLibraryManager(context: vscode.ExtensionContext) {
    if (canRunModusCommand(context) === true) {
        let ran: boolean = false ;
        if (getModusToolboxApp()?.launch) {
            for(const config of getModusToolboxApp()!.launch!.configs) {
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
    if (getModusToolboxApp() !== undefined && getModusToolboxApp()!.isLoading) {
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "you must wait for the current ModusToolbox application to finish loading") ;
        vscode.window.showErrorMessage("You must wait for the current ModusToolbox application to finish loading") ;
        return ;
    }
    if (getModusToolboxApp()) {
        MTBExtensionInfo.getMtbExtensionInfo().showMessageWindow() ;
        
        mtbRunMakeGetLibs(context, getModusToolboxApp()!.appDir)
            .then((code: number) => {
                getModusToolboxApp()!.needVSCode = true ;
                if (code) {
                    let msg: string = "'make getlibs' failed with exit status " + code.toString() ;
                    vscode.window.showErrorMessage(msg) ;
                    MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, msg) ;
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
                MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, msg) ;
            }) ;
        }
}

export function mtbCreateProject(context: vscode.ExtensionContext) {
    if (getModusToolboxApp() !== undefined && getModusToolboxApp()!.isLoading) {
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "you must wait for the current ModusToolbox application to finish loading") ;
        vscode.window.showErrorMessage("You must wait for the current ModusToolbox application to finish loading") ;
        return ;
    }
    
    let pcpath : string = path.join(MTBExtensionInfo.getMtbExtensionInfo().toolsDir, "project-creator", "project-creator") ;
    
    if (process.platform === "win32") {
        pcpath += ".exe" ;
    }

    let post30: boolean = false ;
    let outstr : Buffer ;
    try {
        let major: number = MTBExtensionInfo.getMtbExtensionInfo().major ;
        let minor: number = MTBExtensionInfo.getMtbExtensionInfo().minor ;

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

    MTBExtensionInfo.getMtbExtensionInfo().showMessageWindow() ;
    MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "reading ModusToolbox application state, please wait ...") ;

    let projects : any[] ;

    if (outstr.length === 0) {
        //
        // Something happened, we did not get any output
        //
        let msg: string =  "No output detected from ModusToolbox project creator.  Did you close the window prematurely?" ;
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, msg);
        vscode.window.showErrorMessage(msg);
        return ;
    }
    
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
    MTBExtensionInfo.getMtbExtensionInfo().setPersistedBoolean(MTBExtensionInfo.debugModeName, true) ;
}

export function mtbTurnOffDebugMode(context: vscode.ExtensionContext) {
    MTBExtensionInfo.getMtbExtensionInfo().setPersistedBoolean(MTBExtensionInfo.debugModeName, false) ;
}

export function mtbTurnOnCodeExampleReadme(context: vscode.ExtensionContext) {
    MTBExtensionInfo.getMtbExtensionInfo().setPersistedBoolean(MTBExtensionInfo.readmeName, true) ;
}

export function mtbTurnOffCodeExampleReadme(context: vscode.ExtensionContext) {
    MTBExtensionInfo.getMtbExtensionInfo().setPersistedBoolean(MTBExtensionInfo.readmeName, false) ;
}

export function mtbSymbolDoc(editor: vscode.TextEditor, edit: vscode.TextEditorEdit, context: vscode.ExtensionContext) {
    if (vscode.window.activeTextEditor) {
        let uri: vscode.Uri = editor.document.uri ;
        let pos: vscode.Position = editor.selection.active ;

        //
        // First try to look up in our symbol index
        //
        let range = editor.document.getWordRangeAtPosition(pos) ;
        let symbol = editor.document.getText(range) ;
        let appinfo = getModusToolboxApp() ;

        if (appinfo && appinfo.funindex.contains(symbol)) {
            let url: string | undefined = getModusToolboxApp()!.funindex.getUrl(symbol) ;
            if (url) {
                MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "launching docs at location '" + url + "'");
                browseropen(decodeURIComponent(url)) ;            
            }
        }
        else {
            vscode.commands.executeCommand("vscode.executeDefinitionProvider", uri, pos)
                .then(value => {
                    let locs : vscode.Location[] = value as vscode.Location[] ;
                    if (locs.length > 0) {
                        for(let loc of locs) {
                            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "symbol found in path '" + loc.uri.fsPath + "'");
                            let asset: MTBAssetInstance|undefined = MTBAssetInstance.mtbPathToInstance(loc.uri.fsPath) ;
                            if (asset) {
                                asset.displayDocs(symbol) ;
                                return ;
                            }
                        }
                        let msg: string = "Symbol under cursors is not part of an asset." ;
                        vscode.window.showInformationMessage(msg) ;
                    }
                    else {
                        vscode.window.showInformationMessage("Text under cursor is not a 'C' symbol") ;
                    }
                }) ;
        }
    }
}

export function mtbSetIntellisenseProject(context: vscode.ExtensionContext) {
    const prefix: string = "Intellisense: " ;
    let app: MTBAppInfo | undefined = getModusToolboxApp() ;
    if (app === undefined) {
        vscode.window.showInformationMessage("No ModusToolbox Application Loaded") ;
    }
    else if (!MTBExtensionInfo.getMtbExtensionInfo().hasClangD) {
        vscode.window.showInformationMessage("The 'clangd' extension is not installed. The ModusToolbox Assistant cannot manage intellisense.");
    }
    else {
        let projnames : string[] = [] ;
        for(let proj of app.projects) {
            projnames.push(prefix + proj.name) ;
        }

        vscode.window.showQuickPick(projnames, { canPickMany: false })
            .then((picked: string | undefined) => {
                if (picked) {
                    let proj: string = picked.substring(prefix.length) ;
                    let app: MTBAppInfo = getModusToolboxApp()! ;
                    app.setIntellisenseProject(proj) ;
                }
            }) ;
    }
}

export function mtbRefreshDevKits(context: vscode.ExtensionContext) {
    MTBExtensionInfo.getMtbExtensionInfo().getDevKitMgr().scanForDevKits()
        .then((status: boolean) => { 
            mtbShowWelcomePage(context, 3) ;
        })
        .catch((err) => { 
            vscode.window.showErrorMessage("Error scanning for development kits: " + err.message) ;
        }) ;
}