import { PlatformType } from "../../comms";
import { ModusToolboxEnvironment } from "../../mtbenv/mtbenv/mtbenv";
import { PlatformAPI } from "./platformapi";
import * as path from 'path';
import * as fs from 'fs';
import * as winston from 'winston';
import * as vscode from 'vscode';
import * as vscodeuri from 'vscode-uri';
import * as EventEmitter from 'events' ;
import { MTBLoadFlags } from "../../mtbenv/mtbenv/loadflags";

interface OutputPercentMap {
    match: RegExp ;
    message: string ;
    start: number ;
    adder: number ;
    maximum: number ;
}

export class VSCodeAPI extends EventEmitter implements PlatformAPI  {
    private static projectCreatorToolUuid = '9aac89d2-e375-474f-a1cd-79caefed2f9c' ;
    private static projectCreatorCLIName = 'project-creator-cli' ;
    private static modusShellToolUuid = '0afffb32-ea89-4f58-9ee8-6950d44cb004' ;
    private static modusShellMakePath = 'bin/make' ;
    private static gitAutoDetectSettingName = 'git.autoRepositoryDetection' ;

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

    private env_: ModusToolboxEnvironment;
    private logger_: winston.Logger;
    private createProjectIndex_ : number = 0 ;
    private createProjectPercent_ : number = 0 ;
    private makeLines_ : number = 0 ;

    public constructor(logger: winston.Logger, env: ModusToolboxEnvironment) {
        super() ;
        this.env_ = env;
        this.logger_ = logger;

        this.env_.on('loaded', this.dataLoaded.bind(this)) ;
    }

    public getPlatform(): PlatformType {
        return 'vscode';
    }

    public loadWorkspace(projdir: string, projname: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let p = path.join(projdir, projname, projname + '.code-workspace');
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
            let m = VSCodeAPI.createProjectMessages[this.createProjectIndex_].match.exec(line);
            if (m) {
                //
                // Matches the current line
                //
                let str = VSCodeAPI.createProjectMessages[this.createProjectIndex_].message ;
                if (str.includes('$1') && m.length > 1) {
                    str = str.replace('$1', m[1]);
                }
                this.createProjectPercent_ += VSCodeAPI.createProjectMessages[this.createProjectIndex_].adder ;
                if (this.createProjectPercent_ > VSCodeAPI.createProjectMessages[this.createProjectIndex_].maximum) {
                    this.createProjectPercent_ = VSCodeAPI.createProjectMessages[this.createProjectIndex_].maximum;
                }
                this.sendProgress(str, this.createProjectPercent_);
            }

            if (this.createProjectIndex_ < VSCodeAPI.createProjectMessages.length - 1) {
                m = VSCodeAPI.createProjectMessages[this.createProjectIndex_ + 1].match.exec(line);
                if (m) {
                    this.createProjectIndex_++;
                    let str = VSCodeAPI.createProjectMessages[this.createProjectIndex_].message ;
                    if (str.includes('$1') && m.length > 1) {
                        str = str.replace('$1', m[1]);
                    }
                    this.createProjectPercent_ = VSCodeAPI.createProjectMessages[this.createProjectIndex_].start ;
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
                    let arg = config.get(VSCodeAPI.gitAutoDetectSettingName) ;
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
                    config.update(VSCodeAPI.gitAutoDetectSettingName, value, vscode.ConfigurationTarget.Global)
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

    public async createProject(projdir: string, appdir: string, bspid: string, ceid: string): Promise<[number, string[]]> {
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
                ModusToolboxEnvironment.runCmdCaptureOutput(projdir, cliPath, ['--use-modus-shell', '-b', bspid, '-a', ceid , '-d', projdir, '-n', appdir], this.createProjectCallback.bind(this))
                .then(async (result) => {
                    if (gitAutoRepoDetect) {
                        await this.setAutoRepoDetect(true) ;
                    }
                    if (result[0] !== 0) {
                        resolve([-1, [`Failed to create project '${bspid} - ${ceid}'`]]);
                        return;
                    }
                    this.sendProgress('Preparing VS Code workspace', 80);
                    this.runMakeVSCodeCommand(projdir, appdir)
                    .then((makeResult) => {
                        if (makeResult[0] !== 0) {
                            resolve([-1, [`Failed to create project '${bspid} - ${ceid}': ${makeResult[1].join('\n')}`]]);
                            return;
                        }   
                        resolve([0, [`Application '${bspid} - ${ceid}' created successfully.`]]);
                    }) ;
                })
                .catch((error) => {
                    resolve([-1, [`Failed to create project '${bspid} - ${ceid}': ${error.message}`]]);
                });
            }            
        }) ;
    }

    private makeVSCodeCallback(lines: string[]) {
        let laststep = VSCodeAPI.createProjectMessages[VSCodeAPI.createProjectMessages.length - 1].maximum ;
        this.makeLines_ += lines.length ;
        this.createProjectPercent_ = Math.round((this.makeLines_ / 168) * (100 - laststep)) + laststep ;
        this.sendProgress('Preparing VS Code workspace', this.createProjectPercent_);
    }

    private runMakeVSCodeCommand(projdir: string, appdir: string): Promise<[number, string[]]> {
        return new Promise<[number, string[]]>((resolve, reject) => {
            let p = path.join(projdir, appdir);
            let cliPath = this.findMakePath();
            if (cliPath === undefined) {
                resolve([-1, ["modus shell not found."]]) ;
            }
            else {
                this.makeLines_ = 0 ;
                ModusToolboxEnvironment.runCmdCaptureOutput(p, cliPath, ['vscode'], this.makeVSCodeCallback.bind(this))
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
        let ret = new Promise<void>((resolve) => {
            let proj = this.env_.appInfo?.projects.find((p) => p.name === projname);
            if (!proj) {
                this.logger_.error(`Project '${projname}' not found.`) ;
                resolve() ;
                return;
            }

            this.runMakeGetLibs(this.env_.appInfo!.appdir, proj.name)
            .then((result) => {
                if (result[0] !== 0) {
                    this.logger_.error(`Failed to fix missing assets for project '${projname}': ${result[1].join('\n')}`) ;
                } else {
                    this.logger_.info(`Successfully fixed missing assets for project '${projname}'.`) ;
                }
                resolve() ;
            }) ;
        }) ;
        return ret ;
    }    

    private dumpMakeOutput(lines: string[]) {
        for (let line of lines) {   
            this.logger_.debug(`Make output: ${line}`) ;
        }
    }

    private runMakeGetLibs(appdir: string, projdir: string): Promise<[number, string[]]> {
        return new Promise<[number, string[]]>((resolve, reject) => {
            let p = path.join(appdir, projdir);
            let cliPath = this.findMakePath();
            if (cliPath === undefined) {
                resolve([-1, ["modus shell not found."]]) ;
            }
            else {
                this.makeLines_ = 0 ;
                ModusToolboxEnvironment.runCmdCaptureOutput(p, cliPath, ['getlibs'], this.dumpMakeOutput.bind(this))
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
        let tool = this.env_.toolsDB.findToolByGUID(VSCodeAPI.modusShellToolUuid);
        if (tool === undefined) {
            return undefined;
        }

        return path.join(tool.path, VSCodeAPI.modusShellMakePath);
    }    

    private findProjectCreatorCLIPath() : string | undefined {
        let tool = this.env_.toolsDB.findToolByGUID(VSCodeAPI.projectCreatorToolUuid);
        if (tool === undefined) {
            return undefined;
        }

        return path.join(tool.path, VSCodeAPI.projectCreatorCLIName);
    }
}