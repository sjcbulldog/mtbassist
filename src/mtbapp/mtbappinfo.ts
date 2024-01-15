///
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
// This file loads the and maintains the information about the current ModusToolbox
// application.
//
// A new application is loaded by calling mtbAssistLoadApp(appDir) where appDir is
// the directory that contains the ModusToolbox application.  Once this API is called
// the application can be accessed via the global theModusToolboxApp.  The load happens
// in the background and the load may fail, so it is important to check the isLoading
// member to see if the loading processes is underway.  If the load fails or has never
// happened, the isValid member will be false.
//

import * as vscode from 'vscode';
import * as path from 'path' ;
import * as fs from 'fs' ;

import { getMTBDocumentationTreeProvider } from '../mtbdocprovider';
import { getMTBProgramsTreeProvider } from '../mtbprogramsprovider';
import { DocStatusType, MessageType, MTBExtensionInfo, StatusType } from '../mtbextinfo';
import { MTBLaunchInfo } from '../mtblaunchdata';
import { getMTBProjectInfoProvider } from '../mtbprojinfoprovider';
import { MTBProjectInfo } from './mtbprojinfo';
import { runMakeGetAppInfo, runMakeVSCode, runMtbLaunch } from './mtbrunprogs';
import { ModusToolboxEnvTypeNames, ModusToolboxEnvVarNames } from './mtbnames';
import { mtbRunMakeGetLibs } from '../mtbcommands';
import { MtbFunIndex } from '../mtbfunindex';



interface LaunchDoc
{
    location: string,
    path: [ string ],
    project: string,
    title: string,
    type: string
} ;

interface LaunchOutput
{
    configs: [any] ;
    documentation: [LaunchDoc] ;
}

export enum AppType
{
    none,
    mtb2x,
    combined,
    multicore,
    malformed
} ;

export class MTBAppInfo
{
    // The top level directory for the application
    public appDir: string ;

    // The type of this application
    public appType : AppType ;

    // The name of the application
    public appName : string ;

    // The list of projects in the application
    public projects: MTBProjectInfo[];

    // The launch information (configurators and documentation) for the application
    public launch?: MTBLaunchInfo ;

    // If true, the application is currently loading
    public isLoading: boolean ;

    // If true, the application is loaded and valid
    public isValid: boolean ;

    // The extension context
    public context: vscode.ExtensionContext ;

    // The class that maps a given symbol in the source code to help documentation
    public funindex: MtbFunIndex ;

    public needVSCode: boolean ;

    private loadingWksc: boolean ;

    //
    // Create the application object and load its contents in the asynchronously
    //
    constructor(context: vscode.ExtensionContext, appdir : string) {

        this.appDir = appdir ;
        this.projects = [] ;
        this.context = context ;
        this.setLaunchInfo(undefined) ;
        this.appType = AppType.none ;
        this.appName = "UNDEFINED" ;
        this.needVSCode = false ;
        this.isValid = false ;
        this.isLoading = true ;
        this.loadingWksc = false ;
        this.funindex = new MtbFunIndex() ;

        MTBExtensionInfo.getMtbExtensionInfo().manifestDb.addLoadedCallback(MTBAppInfo.manifestLoadedCallback) ;
        MTBExtensionInfo.getMtbExtensionInfo().setStatus(StatusType.Loading) ;

        vscode.tasks.onDidEndTask((e: vscode.TaskEndEvent) => {
            let t = e.execution.task.name ;
            if (t === 'Build') {
                this.buildTaskEnded() ;
            }
        }) ;
    }

    private buildTaskEnded() {
        if (this.checkCompileCommandsFiles()) {
            vscode.window.showInformationMessage("Fixed intellisense database from ModusToolbox 3.0 or 3.1");            
        }
    }

    private fixDataElements(prefix: string, dirname: string, files: any[]) : boolean {
        let fixed: boolean = false ;

        for(let elem of files) {
            let filename: string | undefined = elem["file"] ;
            if (!filename) {
                continue ;
            }

            if (filename.startsWith(dirname)) {
                fixed = true ;
                let comp: string = elem["command"] as string ;
                let oldstr: string = " " + dirname ;
                let newstr: string = " " + prefix + "/" + dirname ;
                comp = comp.replace(oldstr, newstr) ;
                elem["file"] = path.join(prefix, filename) ;
                elem["command"] = comp ;
                fixed = true ;
            }
        }

        return fixed ;
    }

    private checkOneCompileCommandsFile(prefix: string, dirname: string, file: string) : boolean {
        let ret: boolean = false ;
        let result = fs.readFileSync(file).toString() ;
        if (result) {
            let obj = JSON.parse(result.toString()) ;
            if (obj) {
                if (this.fixDataElements(prefix, dirname, obj as any[])) {
                    ret = true ;
                    let text: string = JSON.stringify(obj) ;
                    fs.writeFileSync(file, text);
                }
            }
        }

        return ret ;
    }

    private checkCompileCommandsFiles() : boolean {
        let fixed: boolean = false ;

        for(let proj of this.projects) {
            let prefix: string | undefined = proj.getVar(ModusToolboxEnvVarNames.MTB_WKS_SHARED_DIR) ;
            let dirname: string | undefined = proj.getVar(ModusToolboxEnvVarNames.MTB_WKS_SHARED_NAME) ;
            if (prefix && dirname) {
                let cmds: string = proj.getBuildCommandsFileName() ;
                if (fs.existsSync(cmds)) {
                    if (this.checkOneCompileCommandsFile(prefix, dirname, cmds)) {
                        fixed = true ;
                    }
                }
            }
        }

        return fixed ;
    }

    private overrideOption(option: string) : boolean {
        let ret: boolean = false ;
        let set: string[] = ["--query-driver", "--background-index"] ;

        for(let opt of set) {
            if (option.startsWith(opt)) {
                ret = true ;
                break ;
            }
        }

        return ret;
    }

    private async checkBasicClangdConfig() : Promise<void> {
        let ret: Promise<void> = new Promise<void>(async (resolve, reject) => {
            let option: string = "--query-driver=" ;
            const settings: string = "clangd.arguments" ;
            let config = await vscode.workspace.getConfiguration() ;

            let args : string[] = config.get(settings) as string[] ;

            let ret: string[] = [] ;
            for(let arg of args) {
                if (!this.overrideOption(option)) {
                    ret.push(arg);
                }
            }

            //
            // TODO: If a new GCC is supplied via the path mechanism, or if the user has 
            //       overridden the GCC path this will not work.  Since core-make determines
            //       the compiler to use, we should have get_app_info output the actual compiler
            //       path for the compiler.
            //
            // Note: Since this is only for intellisense, the default GCC in the tools directory
            //       works ok for sure and is much better than what is there without these changes, so
            //       defaulting to GCC in the tools directory is not all bad.
            //
            ret.push(option + "${config:modustoolbox.toolsPath}/gcc/bin/arm-none-eabi-gcc");
            ret.push("--log=verbose");
            ret.push("--background-index") ;

            config.update(settings, ret, vscode.ConfigurationTarget.Workspace)
                .then(() => { 
                    resolve() ; 
                }) ;
        }) ;

        return ret ;
    }

    //
    // Try to set up an reasonable intellisense environment.  We only attach our changes to the
    // current workspace in memory and not via any on disk settings file.  This way we don't change
    // the user's development environment
    //
    public async trySetupIntellisense() {
        //
        // Make sure the query driver is set to match the gcc in the tools directory
        // for this project.
        //
        if (MTBExtensionInfo.getMtbExtensionInfo().hasClangD) {
            await this.checkBasicClangdConfig() ;
        }

        let toolsdir: string = MTBExtensionInfo.getMtbExtensionInfo().toolsDir ;
        if (toolsdir.endsWith('tools_3.0') || toolsdir.endsWith('tools_3.1')) {
            //
            // If the tools verison is 3.0 or 3.1, there is a bug in the intellisense database
            // (compile_commands.json) file.  This will check for that bug and fix the files 
            // if necessary so intellisense works with 3.0 and 3.1.
            //
            if (this.checkCompileCommandsFiles()) {
                vscode.window.showInformationMessage("Fixed intellisense database from ModusToolbox 3.0 or 3.1");
            }
        }

        if (MTBExtensionInfo.getMtbExtensionInfo().hasClangD) {
            if (this.projects.length > 1) {
                //
                // More than one project, ask the user to choose the intellisense project.
                //
                vscode.window.showInformationMessage("This ModusToolbox project has more than one project.  " + 
                        "Only one project at a time can be active for intellisense.  " + 
                        "This can be changed at any time by clicking the MTB status item in the right of the status bar. " +
                        "Do you want to select the active Intellisense project?",
                        "Yes", "No")
                .then((answer) => {
                    if (answer === "Yes") {
                        vscode.commands.executeCommand('mtbassist.mtbSetIntellisenseProject');
                    }
                });
            }
            else if (this.projects.length === 1) {
                //
                // Just one project, set it to be the intellisense project
                //
                this.setIntellisenseProject(this.projects[0].name) ;
            }
        }
    }

    public async init() : Promise<boolean> {
        let ret: Promise<boolean> = new Promise<boolean>((resolve, reject) => {

            this.initApp(this.appDir)
                .then (async ()=> {
                    this.isValid = true ;
                    this.isLoading = false ;

                    //
                    // Refresh the project information in the window on the left
                    //
                    for(let proj of this.projects) {
                        getMTBProjectInfoProvider().refresh(proj) ;
                    }

                    if (this.appDir) {
                        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
                            //
                            // The ModusToolbox application directory is loaded, but the workspace file is not
                            // ModusToolbox works much better when the genreated workspace file is loaded.  If we see
                            // it, we load the workspace file.
                            //
                            let dirname = path.basename(vscode.workspace.workspaceFolders[0].uri.fsPath) ;
                            let filename = this.appName + ".code-workspace" ;
                            let wksp : string = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, filename) ;
                            if (fs.existsSync(wksp)) {
                                vscode.window.showInformationMessage("Loading worksapce file '" + filename + "'") ;
                                let wkspuri : vscode.Uri = vscode.Uri.file(wksp) ;
                                this.loadingWksc = true ;
                                vscode.commands.executeCommand("vscode.openFolder", wkspuri) ;
                            }
                        }    

                        if (!this.loadingWksc) {
                            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "loaded ModusToolbox application '" + this.appDir + "'") ;
                            vscode.window.showInformationMessage("ModusToolbox application loaded and ready") ;                        
                            MTBExtensionInfo.getMtbExtensionInfo().setStatus(StatusType.Ready) ;

                            //
                            // Add the currently loaded project to the recents list for the home page
                            //
                            MTBExtensionInfo.getMtbExtensionInfo().getRecentAppMgr().addToRecentProjects(this.context, this.appDir) ;

                            //
                            // Try to make sure intellisense is initialized to something that works 
                            // for the current project.
                            //
                            if (MTBExtensionInfo.getMtbExtensionInfo().getIntellisenseProject() === undefined) {
                                await this.trySetupIntellisense() ;
                            }
  
                            //
                            // Update the assets display on the left
                            //
                            this.updateAssets() ;

                            //
                            // Be sure we have all of the assets required by the project 
                            //
                            let missing: string[] = this.checkAllAssetsPresent() ;
                            if (missing.length > 0) {
                                let str : string = "There are assets that are required by this applicadtion that are not " +
                                "available locally.  Should 'make getlibs' be run to download these assets " +
                                "from github? " ;

                                str += "Missing Assets:" ;
                                for(let miss of missing) {
                                    str += " " + miss ;
                                }

                                vscode.window.showInformationMessage(str, "Yes", "No")
                                    .then((answer) => {
                                        if (answer === "Yes") {
                                            vscode.commands.executeCommand('mtbassist.mtbRunMakeGetlibs');
                                        }
                                    });                                                                     
                            }

                            //
                            // Scrub the assets looking for documentation that we might display to the
                            // user.  This happens in the background.
                            //
                            MTBExtensionInfo.getMtbExtensionInfo().setDocStatus(DocStatusType.running) ;
                            this.funindex.init(this)
                                .then ((count: number)=> {
                                    MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "loaded " + count + " symbols for documentation") ;
                                    MTBExtensionInfo.getMtbExtensionInfo().setDocStatus(DocStatusType.complete) ;
                                })
                                .catch((error)=> {
                                    MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "error processing symbols for ModusToolbox Documentation command");
                                    MTBExtensionInfo.getMtbExtensionInfo().setDocStatus(DocStatusType.error) ;
                                }) ;
                            resolve(true) ;
                        }
                    }
                })
                .catch((error) => {
                    this.isValid = false ;
                    this.isLoading = false ;
                    MTBExtensionInfo.getMtbExtensionInfo().setStatus(StatusType.NotValid);
                    MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "the application directory '" + this.appDir + "' is not a ModusToolbox application") ;
                    reject(error) ;
                }) ;
            }) ;
        return ret ;
    }

    public async setIntellisenseProject(projname: string) {
        const settings: string = "clangd.arguments" ;
        let proj: MTBProjectInfo | undefined = this.getProjectByName(projname) ;
        let iset: boolean = false ;

        if (proj) {
            //
            // Find the compile commands file
            //
            let compilecmds: string ;

            if (this.appType === AppType.multicore) {
                compilecmds = "${workspaceFolder}/" + proj.name + "/build" ;
            }
            else {
                compilecmds = "${workspaceFolder}/build" ;
            }

            let config = await vscode.workspace.getConfiguration() ;
            let clangargs : string[] = config.get(settings) as string[] ;
            clangargs = this.updateCompileCommands(clangargs, compilecmds) ;
            config.update(settings, clangargs, vscode.ConfigurationTarget.Workspace)
                .then((value) => {
                    vscode.commands.executeCommand('clangd.restart')
                    .then((obj) => {
                        MTBExtensionInfo.getMtbExtensionInfo().setIntellisenseProject(projname);
                    });
                }) ;


            iset = true ;
        }

        if (!iset) {
            MTBExtensionInfo.getMtbExtensionInfo().setIntellisenseProject("");
        }
    }

    private checkAssetsForProject(proj: MTBProjectInfo, ret: string[]) {
        for(let asset of proj.assets) {
            if (asset.fullpath && !fs.existsSync(asset.fullpath)) {
                if (ret.indexOf(asset.id!) === -1) {
                    MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "missing asset '" + asset.id! + "' - location: '" + asset.location! + "'");
                    ret.push(asset.id!);
                }
            }
        }
    }

    private checkAllAssetsPresent() : string[] {
        let ret: string[] = [] ;

        for(let proj of this.projects) {
            this.checkAssetsForProject(proj, ret) ;
        }

        return ret;
    }

    private updateCompileCommands(args: string[], cmds: string) : string[] {
        let option: string = "--compile-commands-dir=" ;
        let ret: string[] = [] ;

        for(let arg of args) {
            if (!arg.startsWith(option)) {
                ret.push(arg);
            }
        }

        ret.push(option + cmds) ;

        return ret ;
    }

    public getProjectByName(name: string) : MTBProjectInfo | undefined {
        let ret: MTBProjectInfo | undefined = undefined ;
        for(let proj of this.projects) {
            if (proj.name === name) {
                ret = proj ;
                break ;
            }
        }

        return ret ;
    }


    //
    // This method determines the application type.  It basically figures out if this is a
    // single project or multi project application and whether it is a 2x or 3x project.  It
    // also detects if this is not a ModusToolbox application at all.
    //
    private checkAppType() : Promise<[AppType, Map<string, string>]> {
        let ret : Promise<[AppType, Map<string, string>]> = new Promise<[AppType, Map<string, string>]>((resolve, reject) => {
            runMakeGetAppInfo(this.appDir)
                .then((data : Map<string, string>) => {
                    let dir: string | undefined = data.get(ModusToolboxEnvVarNames.MTB_TOOLS_DIR) ;
                    if (dir) {
                        if (!fs.existsSync(dir)) {
                            reject(new Error("the tools directory '" + dir + "' does not exists"))  ;
                        }

                        if (!fs.statSync(dir).isDirectory()) {
                            reject(new Error("the tools directory '" + dir + "' is not a directory")) ;
                        }

                        //
                        // The initial tools directory found the most recent tools dir to get
                        // things started.  However, the application we are loading may be using
                        // a different set of tools, so now that the application can tell us what
                        // to use, we replace the tools directory.
                        //
                        MTBExtensionInfo.getMtbExtensionInfo().updateToolsDir(dir) ;
                    }

                    if (data.has(ModusToolboxEnvVarNames.MTB_TYPE)) {
                        let ptype: string = data.get(ModusToolboxEnvVarNames.MTB_TYPE)! ;
                        if (ptype === ModusToolboxEnvTypeNames.APPLICATION) {
                            resolve([AppType.multicore, data]) ;
                        }
                        else if (ptype === ModusToolboxEnvTypeNames.COMBINED) {
                            resolve([AppType.combined, data]) ;
                        }
                        else {
                            let err : Error = new Error("unknown MTB_TYPE in application '" + ptype + "'") ;
                            reject(err) ;
                        }
                    }
                    else if (data.has(ModusToolboxEnvVarNames.MTB_PROTOCOL)) {
                        resolve([AppType.mtb2x, data]) ;
                    }
                    else {
                        resolve([AppType.none, data]) ;
                    }
                })
                .catch((err : Error) => {
                    reject(err) ;
                }) ;
        }) ;

        return ret ;
    }

    //
    // This method performs the work that is common to the processing
    // of an application both single core and multi core.
    //
    private processCommonAppStuff() : Promise<void> {
        let ret : Promise<void> = new Promise<void>((resolve, reject) => {
            this.mtbUpdateProgs()
                .then(() => {
                    this.createVSCodeDirectory()
                        .then(()=> {
                            let readme : string = path.join(this.appDir, "README.md") ;
                            if (fs.existsSync(readme)) {
                                let uri: vscode.Uri = vscode.Uri.file(readme) ;
                                vscode.commands.executeCommand("markdown.showPreview", uri) ;
                            }
                            resolve() ;
                        })
                        .catch((err: Error) => {
                            reject(err) ;
                        }) ;
                })
                .catch((err: Error) => {
                    reject(err) ;
                }) ;
        }) ;

        return ret ;
    }

    private doMakeGetLibs(cwd: string) : Promise<Map<string, string>> {
        let ret : Promise<Map<string, string>> = new Promise<Map<string, string>>((resolve, reject) => {
            //
            // There is no valid MTB_DEVICE value, so this means we don't have build
            // support.  We need to run 'make getlibs' to get build support.
            //
            MTBExtensionInfo.getMtbExtensionInfo().setStatus(StatusType.GetLibs) ;
            mtbRunMakeGetLibs(this.context, cwd)
                .then((code: Number) => {
                    if (code === 0) {
                        MTBExtensionInfo.getMtbExtensionInfo().setStatus(StatusType.Loading) ;
                        runMakeGetAppInfo(cwd)
                            .then((makevars: Map<string, string>) => {
                                if (!makevars.has(ModusToolboxEnvVarNames.MTB_DEVICE) || makevars.get(ModusToolboxEnvVarNames.MTB_DEVICE)!.length === 0) {
                                    reject(new Error("The ModusToolbox application is not valid, MTB_DEVICE was not supplied")) ;
                                }
                                resolve(makevars) ;
                            })
                            .catch((err: Error) => {
                                reject(err) ;
                            }) ;
                    }
                    else {
                        let msg: string = "The operation 'make getlibs' failed with exit code " + code.toString() ;
                        reject(new Error(msg)) ;
                    }
                }) 
                .catch((err: Error) => {
                    reject(err) ;
                }) ;
        }) ;

        return ret ;
    }

    private processProject(makevars: Map<string, string>) : Promise<void> {
        let ret : Promise<void> = new Promise<void>((resolve, reject) => {
            //
            // We get here if we  have a valid build environment (e.g. MTB_DEVICE is defined)
            //
            let projobj = new MTBProjectInfo(this, path.basename(this.appDir)) ;
            this.projects.push(projobj) ;
            projobj.initProjectFromData(makevars)
                .then(() => {
                    this.processCommonAppStuff()
                        .then (() => {
                            resolve() ;
                        })
                        .catch((err : Error) => {
                            reject(err) ;
                        }) ;

                })
                .catch((err: Error) => {
                    reject(err) ;
                }) ;            
        }) ;

        return ret ;
    }

    private needsGetLibs(makevars: Map<string, string>, isMtb2x: boolean) {
        let ret: boolean = false ;

        if (isMtb2x) {
            if (!makevars.has(ModusToolboxEnvVarNames.MTB_DEVICE) || makevars.get(ModusToolboxEnvVarNames.MTB_DEVICE)!.length === 0) {
                ret = true ;
            }
        }
        else {
            if (!makevars.has(ModusToolboxEnvVarNames.MTB_CORE_TYPE) || makevars.get(ModusToolboxEnvVarNames.MTB_CORE_TYPE)!.length === 0) {
                ret = true ;
            }
        }

        return ret ;
    }

    //
    // Ok , we are processing a combined application and project.  We have the get_app_info
    // information for the directory, but if we don't have build support we need to run
    // make getlibs and then get the get_app_info information again.
    //
    private processCombined(makevars: Map<string, string>, isMtb2x: boolean) : Promise<void> {
        let ret : Promise<void> = new Promise<void>((resolve, reject) => {
            if (this.needsGetLibs(makevars, isMtb2x)) {
                this.doMakeGetLibs(this.appDir)
                    .then((data: Map<string, string>) => {
                        this.processProject(data)
                        .then(() => {
                            resolve() ;
                        })
                        .catch((err: Error) => {
                            reject(err) ;
                        }) ;  
                    })
                    .catch((err: Error) => {
                        reject(err) ;
                    }) ;  
            }
            else {
                this.processProject(makevars)
                    .then(() => {
                        resolve() ;
                    })
                    .catch((err: Error) => {
                        reject(err) ;
                    }) ;  
            }
        }) ;

        return ret ;
    }

    private createOneProject(projdir: string) : Promise<void> {
        let ret : Promise<void> = new Promise<void>((resolve, reject) => {
            MTBExtensionInfo.getMtbExtensionInfo().setStatus(StatusType.Loading);
            runMakeGetAppInfo(projdir)
                .then((makedata: Map<string, string>) => {
                    let projobj = new MTBProjectInfo(this, path.basename(projdir)) ;
                    this.projects.push(projobj) ;
                    projobj.initProjectFromData(makedata)
                        .then(() => {
                            resolve() ;
                        })
                        .catch((err: Error) => {
                            reject(err) ;
                        }) ; 
                })
                .catch((err: Error) => {
                    reject(err) ;
                }) ;  
        }) ;

        return ret ;
    }

    private processMultiAppStuff(projects: string[]) : Promise<void> {
        let ret : Promise<void> = new Promise<void>((resolve, reject) => {
            let promiseArray: Promise<void>[] = [];

            for (let project of projects) {
                let prom: Promise<void> = this.createOneProject(path.join(this.appDir, project)) ;
                promiseArray.push(prom) ;
            }

            Promise.all(promiseArray)
                .then((results) => {
                    this.processCommonAppStuff()
                        .then (() => {
                            resolve() ;
                        })
                        .catch((err : Error) => {
                            reject(err) ;
                        }) ;
                })
                .catch((err: Error) => {
                    reject(err) ;
                }) ;
        }) ;

        return ret ;
    }

    private checkOneProject(projdir: string) : Promise<boolean> {
        let ret : Promise<boolean> = new Promise<boolean>((resolve, reject) => {
            runMakeGetAppInfo(projdir)
            .then((makevars: Map<string, string>) => {
                if (!makevars.has(ModusToolboxEnvVarNames.MTB_CORE_TYPE) || makevars.get(ModusToolboxEnvVarNames.MTB_CORE_TYPE)!.length === 0) {
                    resolve(true) ;
                }
                else {
                    resolve(false) ;
                }
            })
            .catch((err: Error) => {
                reject(err) ;
            }) ; 
        }) ;

        return ret ;
    }

    //
    // Process a multi-project application
    //
    private processMultiProject(makevars: Map<string, string>) : Promise<void> {
        let ret : Promise<void> = new Promise<void>((resolve, reject) => {
            let projstr = makevars.get(ModusToolboxEnvVarNames.MTB_PROJECTS) ;
            if (projstr === undefined) {
                let msg: string = "make get_app_info in directory '" + this.appDir + "' did not provide the value " ;
                msg += "'" + ModusToolboxEnvVarNames.MTB_PROJECTS + "'" ;
                reject(new Error(msg)) ;
            }
            else {
                let projects : string[] = projstr.split(" ") ;
                let promiseArray: Promise<boolean>[] = [];

                for (let project of projects) {
                    let prom: Promise<boolean> = this.checkOneProject(path.join(this.appDir, project)) ;
                    promiseArray.push(prom) ;
                }

                Promise.all(promiseArray).then((results) => {
                    let needGetLibs : boolean = false ;
                    for(let result of results) {
                        if (result) {
                            needGetLibs = true ;
                        }
                    }

                    if (needGetLibs) {
                        //
                        // Run getlibs at the application level
                        //
                        MTBExtensionInfo.getMtbExtensionInfo().setStatus(StatusType.GetLibs);                    
                        mtbRunMakeGetLibs(this.context, this.appDir)
                            .then((code: number) => {
                                if (code === 0) {
                                    this.processMultiAppStuff(projects)
                                    .then(() => {
                                        resolve() ;
                                    })
                                    .catch((err: Error) => {
                                        reject(err) ;
                                    }) ;
                                }
                                else {
                                    let msg: string = "the operation 'make getlibs' failed in directory '" + this.appDir + "' - exit code " + code.toString() ;
                                    reject(new Error(msg)) ;
                                }
                            })
                            .catch((err: Error) => {
                                reject(err) ;
                            }) ;
                    }
                    else {
                        this.processMultiAppStuff(projects)
                            .then(() => {
                                resolve() ;
                            })
                            .catch((err: Error) => {
                                reject(err) ;
                            }) ;
                    }
                })
                .catch((err: Error) => {
                    reject(err) ;
                }) ;    
            }
        }) ;

        return ret ;
    }

    //
    // Load the application in the background.  Return a promise that will be 
    // completed when the application is loaded.
    //
    public initApp(appdir: string) : Promise<void> {
        this.appDir = appdir ;

        let ret : Promise<void> = new Promise<void>( (resolve, reject) => {
            MTBExtensionInfo.getMtbExtensionInfo().setStatus(StatusType.Loading);
            this.checkAppType()
                .then ((info : [AppType, Map<string, string>]) => {
                    //
                    // checkAppType returns the application type: mtb2x, combined, multicore
                    // It also returns the set of name value pairs get come from "make get_app_info"
                    //
                    this.appType = info[0] ;

                    if (info[0] === AppType.none) {
                        reject(new Error("this is not a ModusToolbox application")) ;
                    }

                    if (info[1].has(ModusToolboxEnvVarNames.MTB_APP_NAME)) {
                        this.appName = info[1].get(ModusToolboxEnvVarNames.MTB_APP_NAME)! ;
                    } else {
                        if (info[1].has(ModusToolboxEnvVarNames.MTB_TYPE) && info[1].get(ModusToolboxEnvVarNames.MTB_TYPE) === ModusToolboxEnvTypeNames.APPLICATION) {
                            this.appName = path.basename(appdir) ;
                        }
                        else {
                            reject(new Error("this is not a valid ModusToolbox application, the application name was not provided")) ;
                        }
                    }

                    if (info[0] === AppType.mtb2x) {
                        this.processCombined(info[1], true).then(() => {
                            resolve() ;
                        })
                        .catch((err : Error) => {
                            reject(err) ;
                        }) ;
                    }   
                    else if (info[0] === AppType.combined) {
                        this.processCombined(info[1], false).then(() => {
                            resolve() ;
                        })
                        .catch((err : Error) => {
                            reject(err) ;
                        }) ;
                    }   
                    else if (info[0] === AppType.multicore) {
                        this.processMultiProject(info[1]).then(() => {
                            resolve() ;
                        })
                        .catch((err : Error) => {
                            reject(err) ;
                        }) ;
                    }  
                })
                .catch((err: Error) => {
                    reject(err) ;
                }) ;
        }) ;
        return ret ;
    }

    static manifestLoadedCallback() {
        if (theModusToolboxApp) {
            theModusToolboxApp.updateAssets() ;
        }
    }

    private updateAssets() {
        for(let proj of this.projects) {
            proj.updateAssets() ;
        }
    }

    private setLaunchInfo(launch?: MTBLaunchInfo) {
        this.launch = launch ;

        if (launch) {
            //
            // If there is valid launch information, update the quick launch panel on
            // the left of the screen
            //
            getMTBProgramsTreeProvider().refresh(this.launch?.configs) ;
            getMTBDocumentationTreeProvider().refresh(this.launch?.docs) ;
        }
        else {
            //
            // There is no valid application and therefore not valid quick launch
            // information.  Reset the quick launch panels to their default values
            //
            getMTBProgramsTreeProvider().refresh(undefined) ;
            getMTBDocumentationTreeProvider().refresh(undefined) ;
        }
    }

    private hasComponent(comp: string) : boolean {
        for(let proj of this.projects)
        {
            if (proj.getComponents().indexOf(comp) !== -1) {
                return true ;
            }
        }

        return false ;
    }
    
    private filterComponents(obj: LaunchOutput) : LaunchOutput {
        let newobj: LaunchOutput = new Object() as LaunchOutput ;
        let regex: RegExp = /\/COMPONENT_[a-zA-Z0-9\-_]+\//;
    
        if (obj.configs !== undefined) {
            newobj.configs = obj.configs ;
        }
    
        newobj.documentation = [] as unknown as [LaunchDoc] ;
    

        for(let doc of obj.documentation)
        {
            let add : boolean = true ;
            let result = regex.exec(doc.location) ;
            if (result)
            {
                let component = result[0].substring(11, result[0].length - 1) ;
                if (!this.hasComponent(component))
                {
                    add = false ;
                }
            }
            if (add)
            {
                newobj.documentation.push(doc);
            }
        }
    
        return newobj ;
    }    

    private mtbUpdateProgs() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            runMtbLaunch(this.appDir)
                .then ((jsonobj: any) => {
                    let obj = this.filterComponents(jsonobj);
                    this.setLaunchInfo(new MTBLaunchInfo(obj as any));
                    resolve() ;
                })
                .catch ((error) => {
                    reject(error) ;
                }) ;
            }) ;
        return ret ;
    }    

    //
    // Check for the .vscode directory and if it does not exist, run 
    // make vscode to create the vscode support needed.
    //
    private createVSCodeDirectory() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let vscodedir: string = path.join(this.appDir, ".vscode") ;
            fs.stat(vscodedir, (err, stats) => {
                let needvs: boolean = false ;

                if (this.needVSCode) {
                    needvs = true ;
                }
                else if (err && err.code === 'ENOENT') {
                    needvs = true ;
                }
                else if (err) {
                    reject(err) ;
                }
                if (needvs) {
                    //
                    // The .vscode directory does not exist, create it
                    //
                    MTBExtensionInfo.getMtbExtensionInfo().setStatus(StatusType.VSCode);
                    runMakeVSCode(this.appDir)
                        .then( () => { 
                            resolve() ;
                        })
                        .catch( (error) => { 
                            reject(error) ;
                        }) ;
                }
                else {
                    resolve() ;
                }
            }) ;
        }) ;
        return ret ;
    }
}

let theModusToolboxApp : MTBAppInfo | undefined = undefined ;

export function getModusToolboxApp() : MTBAppInfo | undefined {
    return theModusToolboxApp ;
}

//
// Load a new application in as the ModusToolbox application being processed
//
export async function mtbAssistLoadApp(context: vscode.ExtensionContext, appdir?: string) : Promise<boolean> {
    let ret: Promise<boolean> = new Promise<boolean>((resolve, reject) => {
        if (appdir && theModusToolboxApp !== undefined && theModusToolboxApp.appDir === appdir && theModusToolboxApp.isLoading) {
            reject(new Error("trying to load ModusToolbox application recursively")) ;
        }

        if (appdir) {
            theModusToolboxApp = new MTBAppInfo(context, appdir) ;
            theModusToolboxApp.init()
                .then((status) => {
                    resolve(status) ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
            
        } else {
            theModusToolboxApp = undefined ;
            resolve(false) ;
        }
    }) ;

    return ret ;
}


