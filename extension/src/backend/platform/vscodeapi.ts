import { PlatformType } from "../../comms";
import { ModusToolboxEnvironment } from "../../mtbenv/mtbenv/mtbenv";
import { PlatformAPI } from "./platformapi";
import * as path from 'path';
import * as winston from 'winston';
import * as vscode from 'vscode';
import * as vscodeuri from 'vscode-uri';

export class VSCodeAPI implements PlatformAPI {
    private static projectCreatorToolUuid = '9aac89d2-e375-474f-a1cd-79caefed2f9c' ;
    private static projectCreatorCLIName = 'project-creator-cli' ;
    private static modusShellToolUuid = '0afffb32-ea89-4f58-9ee8-6950d44cb004' ;
    private static modusShellMakePath = 'bin/make' ;

    private env_: ModusToolboxEnvironment;
    private logger_: winston.Logger;

    public constructor(logger: winston.Logger, env: ModusToolboxEnvironment) {
        this.env_ = env;
        this.logger_ = logger;
    }

    public getPlatform(): PlatformType {
        return 'vscode';
    }

    public loadWorkspace(p: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.logger_.info('Loading VS Code workspace...');
            let wkspuri = vscodeuri.URI.parse(p) ;
            vscode.commands.executeCommand("vscode.openFolder", wkspuri) ;
            resolve();
        }) ;
    }

    public createProject(projdir: string, appdir: string, bspid: string, ceid: string): Promise<[number, string[]]> {
        return new Promise<[number, string[]]>((resolve, reject) => {
            let cliPath = this.findProjectCreatorCLIPath();
            if (cliPath === undefined) {
                resolve([-1, ["project creator CLI not found."]]) ;
            }
            else {
                ModusToolboxEnvironment.runCmdCaptureOutput(projdir, cliPath, ['--use-modus-shell', '-b', bspid, '-a', ceid , '-d', projdir, '-n', appdir])
                .then((result) => {
                    for(let line of result[1]) {
                        this.logger_.error(line);
                    }                    
                    if (result[0] !== 0) {
                        resolve([-1, [`Failed to create project '${bspid} - ${ceid}'`]]);
                        return;
                    }
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
        });
    } 

    private runMakeVSCodeCommand(projdir: string, appdir: string): Promise<[number, string[]]> {
        return new Promise<[number, string[]]>((resolve, reject) => {
            let p = path.join(projdir, appdir);
            let cliPath = this.findMakePath();
            if (cliPath === undefined) {
                resolve([-1, ["modus shell not found."]]) ;
            }
            else {
                ModusToolboxEnvironment.runCmdCaptureOutput(p, cliPath, ['vscode'])
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