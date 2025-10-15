/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { PlatformType } from "../comms";
import { ModusToolboxEnvironment, MTBRunCommandOptions } from "../mtbenv/mtbenv/mtbenv";
import * as path from 'path';
import * as fs from 'fs';
import * as winston from 'winston';
import * as vscode from 'vscode';
import * as vscodeuri from 'vscode-uri';
import * as EventEmitter from 'events' ;
import { MTBLoadFlags } from "../mtbenv/mtbenv/loadflags";
import { MTBAssistObject } from "./mtbassistobj";
import { MTBProjectInfo } from "../mtbenv/appdata/mtbprojinfo";
import { ApplicationType } from "../mtbenv/appdata/mtbappinfo";

export interface TaskToRun {
    task: string ;
    project: string | undefined ;
}

interface OutputPercentMap {
    match: RegExp ;
    message: string ;
    start: number ;
    adder: number ;
    maximum: number ;
}

export class VSCodeWorker extends EventEmitter  {
    private static readonly projectCreatorToolUuid = '9aac89d2-e375-474f-a1cd-79caefed2f9c' ;
    private static readonly projectCreatorCLIName = 'project-creator-cli' ;
    private static readonly modusShellToolUuid = '0afffb32-ea89-4f58-9ee8-6950d44cb004' ;
    private static readonly modusShellMakePath = 'bin/make' ;
    private static readonly gitAutoDetectSettingName = 'git.autoRepositoryDetection' ;

    private static createProjectMessages : OutputPercentMap[] = [
        { 
            match: /Finished loading the ModusToolbox Technology Packs and Early Access Packs/,  
            message: 'Loading ModusToolbox Information',
            adder: 0,
            start: 10,
            maximum: 10,
        },
        { 
            match: /Starting application creation for '(.*)'/,  
            message: 'Creating application $1',
            adder: 0,
            start: 10,
            maximum: 20
        },
        { 
            match: /Processing project '(.*)'/,  
            message: 'Processing project $1',
            adder: 20,
            start: 20,
            maximum: 80,
        },
    ] ;

    private logger_: winston.Logger;
    private createProjectIndex_ : number = 0 ;
    private createProjectPercent_ : number = 0 ;
    private makeLines_ : number = 0 ;
    private ext_ : MTBAssistObject;

    public constructor(logger: winston.Logger, ext: MTBAssistObject) {
        super() ;
        this.logger_ = logger;
        this.ext_ = ext;

        this.ext_.env!.on('loaded', this.dataLoaded.bind(this)) ;
    }

    public getPlatform(): PlatformType {
        return 'vscode';
    }

    public loadWorkspace(projdir: string, projpath: string, projname: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let p = path.join(projdir, projname + '.code-workspace');
            if (!fs.existsSync(p)) {
                p = path.join(projdir, projpath + '.code-workspace') ;
                if (!fs.existsSync(p)) {
                    this.logger_.error(`Workspace file not found: ${p}`) ;
                    reject(new Error(`Workspace file not found: ${p}`)) ;
                    return;
                }
            }
            this.logger_.info(`Loading VS Code workspace... ${p}`) ;
            let wkspuri = vscodeuri.URI.file(p) ;
            vscode.commands.executeCommand("vscode.openFolder", wkspuri) ;
            resolve();
        }) ;
    }

    private dataLoaded(data: MTBLoadFlags) {
        this.emit('dataLoaded', data);
    }

    private createProjectCallback(lines: string[]) {
        for(let line of lines) {
            this.logger_.info(line) ;
            let m = VSCodeWorker.createProjectMessages[this.createProjectIndex_].match.exec(line);
            if (m) {
                //
                // Matches the current line
                //
                let str = VSCodeWorker.createProjectMessages[this.createProjectIndex_].message ;
                if (str.includes('$1') && m.length > 1) {
                    str = str.replace('$1', m[1]);
                }
                this.createProjectPercent_ += VSCodeWorker.createProjectMessages[this.createProjectIndex_].adder ;
                if (this.createProjectPercent_ > VSCodeWorker.createProjectMessages[this.createProjectIndex_].maximum) {
                    this.createProjectPercent_ = VSCodeWorker.createProjectMessages[this.createProjectIndex_].maximum;
                }
                this.sendProgress(str, this.createProjectPercent_);
            }

            if (this.createProjectIndex_ < VSCodeWorker.createProjectMessages.length - 1) {
                m = VSCodeWorker.createProjectMessages[this.createProjectIndex_ + 1].match.exec(line);
                if (m) {
                    this.createProjectIndex_++;
                    let str = VSCodeWorker.createProjectMessages[this.createProjectIndex_].message ;
                    if (str.includes('$1') && m.length > 1) {
                        str = str.replace('$1', m[1]);
                    }
                    this.createProjectPercent_ = VSCodeWorker.createProjectMessages[this.createProjectIndex_].start ;
                    this.sendProgress(str, this.createProjectPercent_);
                }
            }
        }
    }

    private sendProgress(message: string, percent: number) {
        this.emit('progress', { message: message, percent: percent}) ;
    }

    private async getAutoRepoDetect() : Promise<boolean> {
        let ret = new Promise<boolean>(async (resolve, reject) => {
            let v = false ;
            try {
                let config = await vscode.workspace.getConfiguration() ;
                if (config) {
                    let arg = config.get(VSCodeWorker.gitAutoDetectSettingName) ;
                    if (arg && typeof arg === 'boolean') {
                        v = arg as boolean ;
                        this.logger_.info(`Auto repo detect setting is ${v}`) ;
                    }
                }
            }
            catch(error) {
                this.logger_.error(`Error getting auto repo detect setting: ${error}`) ;
            }
            resolve(v) ;
        }) ;

        return ret;
    }

    private async setAutoRepoDetect(value: boolean) : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            this.logger_.info(`Setting auto repo detect setting is ${value}`) ;
            try {
                let config = await vscode.workspace.getConfiguration() ;
                if (config) {
                    config.update(VSCodeWorker.gitAutoDetectSettingName, value, vscode.ConfigurationTarget.Global)
                    .then(() => {
                        this.logger_.info(`Auto repo detect setting updated to ${value}`) ;
                        resolve() ;
                    }) ;
                }
            }
            catch(error) {
                this.logger_.error(`Error getting auto repo detect setting: ${error}`) ;
                reject(error) ;
            }
        }) ;

        return ret;
    }

    public async createProject(targetdir: string, appname: string, bspid: string, ceid: string, prepvscode : boolean = true): Promise<[number, string[]]> {
        return new Promise<[number, string[]]>(async (resolve, reject) => {
            let cliPath = this.findProjectCreatorCLIPath();
            if (cliPath === undefined) {
                resolve([-1, ["project creator CLI not found."]]) ;
            }
            else {
                let gitAutoRepoDetect = await this.getAutoRepoDetect() ;
                if (gitAutoRepoDetect) {
                    await this.setAutoRepoDetect(false) ;
                }

                this.sendProgress(`Creating project '${bspid} - ${ceid}'`, 0);
                this.createProjectIndex_ = 0 ;
                this.createProjectPercent_ = 0 ;
                let args: string[] = ['--use-modus-shell', '-b', bspid, '-a', ceid , '-d', targetdir, '-n', appname] ;
                let opts: MTBRunCommandOptions = {
                    toolspath: this.ext_.toolsDir,
                    id: 'createproject',
                    onOutput: this.createProjectCallback.bind(this),
                    cwd: targetdir
                } ;

                ModusToolboxEnvironment.runCmdCaptureOutput(this.logger_, cliPath, args, opts)
                .then(async (result) => {
                    if (gitAutoRepoDetect) {
                        await this.setAutoRepoDetect(true) ;
                    }
                    if (result[0] !== 0) {
                        resolve([-1, [`Failed to create project '${bspid} - ${ceid}'`]]);
                        return;
                    }

                    if (!prepvscode) {
                        resolve([0, [`Application '${bspid} - ${ceid}' created successfully.`]]);
                        return ;
                    }
                    else {
                        this.sendProgress('Preparing VS Code workspace', 80);
                        this.logger_.info('-----------------------------------------------') ;
                        this.logger_.info('Preparing project for VSCode') ;
                        this.logger_.info('-----------------------------------------------') ;                      
                        this.runMakeVSCodeCommand(path.join(targetdir, appname))
                        .then((makeResult) => {
                            if (makeResult[0] !== 0) {
                                resolve([-1, [`Failed to create project '${bspid} - ${ceid}': ${makeResult[1].join('\n')}`]]);
                                return;
                            }   
                            resolve([0, [`Application '${bspid} - ${ceid}' created successfully.`]]);
                        }) ;
                    }
                })
                .catch((error) => {
                    resolve([-1, [`Failed to create project '${bspid} - ${ceid}': ${error.message}`]]);
                });
            }            
        }) ;
    }

    public runAction(action: string, project: string | undefined): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let task = this.mapActionToTask(action, project);
            this.emit('runtask', task) ;
        });
    }

    private mapActionToTask(action: string, project: string | undefined) :TaskToRun {
        let ret : TaskToRun = { task: '', project: undefined } ;
        switch(action) {
            case 'build':
                ret.task = `Build`;
                break ;
            case 'rebuild':
                ret.task = `Rebuild`;
                break ;
            case 'clean':
                ret.task = `Clean`;
                break ;
            case 'program':
                ret.task = `Build & Program`;
                break ;
            case 'quick-program':
                ret.task = `Quick Program`;
                break ;
            case 'erase-all':
                ret.task = `Erase All`;
                break ;
            case 'erase':
                ret.task = `Erase Device`;
                break ;
            default:
                ret = { task: '', project: undefined } ;
                break ;
        }

        if (this.ext_.env!.appInfo!.type() !== ApplicationType.combined) {
            if (ret.task.length > 0 && project) {
                ret.project = project;
            }
        }

        return ret ;
    }

    private makeVSCodeCallback(lines: string[]) {
        let laststep = VSCodeWorker.createProjectMessages[VSCodeWorker.createProjectMessages.length - 1].maximum ;
        this.makeLines_ += lines.length ;
        this.createProjectPercent_ = Math.round((this.makeLines_ / 168) * (100 - laststep)) + laststep ;
        this.sendProgress('Preparing VS Code workspace', this.createProjectPercent_);
              
        for(let line of lines) {
            this.logger_.info(line) ;            
        }
    }

    public runMakeVSCodeCommand(appdir: string): Promise<[number, string[]]> {
        return new Promise<[number, string[]]>((resolve, reject) => {
            let p = appdir ;
            let cliPath = this.findMakePath();
            if (cliPath === undefined) {
                resolve([-1, ["modus shell not found."]]) ;
            }
            else {
                this.makeLines_ = 0 ;
                let args: string[] = ['vscode'];
                let opts: MTBRunCommandOptions = {
                    toolspath: this.ext_.toolsDir,
                    id: 'vscode',
                    onOutput: this.makeVSCodeCallback.bind(this),
                    cwd: p
                };
                ModusToolboxEnvironment.runCmdCaptureOutput(this.logger_, cliPath, args, opts)
                .then((result) => {
                    resolve([0, [``]]);
                })
                .catch((error) => {
                    resolve([-1, [``]]);
                });
            }
        });
    }   

    public fixMissingAssets(projname: string): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let proj = this.ext_.env!.appInfo?.projects.find((p) => p.name === projname);
            if (!proj) {
                this.logger_.error(`Project '${projname}' not found.`) ;
                resolve() ;
                return;
            }

            this.runMakeGetLibs(proj)
            .then((result) => {
                if (result[0] !== 0) {
                    this.logger_.error(`Failed to fix missing assets for project '${projname}': ${result[1].join('\n')}`) ;
                } else {
                    this.logger_.info(`Successfully fixed missing assets for project '${projname}'.`) ;
                }
                resolve() ;
            })
            .catch((error) => {
                this.logger_.error(`Failed to fix missing assets for project '${projname}': ${error.message}`) ;
                reject(error) ;
            });
        }) ;
        return ret ;
    }    

    private dumpMakeOutput(lines: string[]) {
        let reg = /loaded asset ('.*')/ ;
        for (let line of lines) {   
            this.logger_.debug(`Make output: ${line}`) ;
            let m = reg.exec(line);
            if (m) {
                this.emit('loadedAsset', m[1]);
            }
        }
    }

    public runMakeGetLibs(proj: MTBProjectInfo): Promise<[number, string[]]> {
        return new Promise<[number, string[]]>((resolve, reject) => {
            let p = proj.path ;
            let cliPath = this.findMakePath();
            if (cliPath === undefined) {
                resolve([-1, ["modus shell not found."]]) ;
            }
            else {
                this.makeLines_ = 0 ;
                if (process.platform === 'win32') {
                    cliPath += ".exe" ;
                }
                let args = ['getlibs'];
                let tools = this.ext_.toolsDir! ;
                let opts: MTBRunCommandOptions = {
                    toolspath: tools,
                    id: 'getlibs',
                    onOutput: this.dumpMakeOutput.bind(this),
                    cwd: p
                };
                ModusToolboxEnvironment.runCmdCaptureOutput(this.logger_, cliPath, args, opts)
                .then((result) => {
                    resolve([0, [``]]);
                })
                .catch((error) => {
                    resolve([-1, [``]]);
                });
            }
        });
    }       

    private findMakePath() : string | undefined {
        let tool = this.ext_.env!.toolsDB.findToolByGUID(VSCodeWorker.modusShellToolUuid);
        if (tool === undefined) {
            return undefined;
        }

        return path.join(tool.path, VSCodeWorker.modusShellMakePath);
    }    

    private findProjectCreatorCLIPath() : string | undefined {
        let tool = this.ext_.env!.toolsDB.findToolByGUID(VSCodeWorker.projectCreatorToolUuid);
        if (tool === undefined) {
            return undefined;
        }

        return path.join(tool.path, VSCodeWorker.projectCreatorCLIName);
    }
}