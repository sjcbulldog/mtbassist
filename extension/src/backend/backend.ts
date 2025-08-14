import { ModusToolboxEnvironment } from "../mtbenv/mtbenv/mtbenv";
import { URI } from "vscode-uri";
import { BrowserAPI } from "./platform/browserapi";
import { VSCodeAPI } from "./platform/vscodeapi";
import { ElectronAPI } from "./platform/electronapi";
import { BackEndToFrontEndResponse, CodeExampleIdentifier, FrontEndToBackEndRequest, PlatformType } from "../comms";
import { BSPMgr } from "./bspmgr";
import { MTBApp } from "../mtbenv/manifest/mtbapp";
import { PlatformAPI } from "./platform/platformapi";
import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import EventEmitter = require("events");

export class BackendService extends EventEmitter {
    private static instance: BackendService | null = null;

    private apis_: PlatformAPI | undefined = undefined;
    private env_ : ModusToolboxEnvironment | undefined;
    private logger_ : winston.Logger ;
    private bsps_ : BSPMgr | undefined;

    private cmdhandler_ : Map<string, (request: FrontEndToBackEndRequest) => Promise<BackEndToFrontEndResponse | null>> = new Map();

    //
    // Private constructor to enforce singleton pattern
    //
    // Note: The URI is a folder associated with the backend that is a place where 
    //       the backend can store data.
    //
    private constructor(logger: winston.Logger, uri: URI, env: ModusToolboxEnvironment) {
        super();

        //
        // Note, this env object may be in the middle of loading data.  When we want to access it, we should check if it is loaded.
        //
        this.env_ = env ;
        this.logger_ = logger ;
        this.bsps_ = new BSPMgr(uri.fsPath, this.env_) ;
        this.bindCommandHandlers() ;
    }

    public static initInstance(logger: winston.Logger, uri: URI, env: ModusToolboxEnvironment): BackendService {
        if (BackendService.instance === null) {
            BackendService.instance = new BackendService(logger, uri, env);
        }
        return BackendService.instance;
    }

    public static getInstance(): BackendService {
        if (!BackendService.instance) {
            throw new Error("BackendService is not initialized. Call initInstance first.");
        }
        return BackendService.instance;
    }

    public get env(): ModusToolboxEnvironment {
        if (this.env_ === undefined) {
            throw new Error("ModusToolbox environment is not initialized.");
        }
        return this.env_!;
    }

    public get bspsMgr() : BSPMgr {
        if (this.bsps_ === undefined) {
            throw new Error("BSPManager is not initialized.");
        }
        return this.bsps_!;
    }

    public processRequest(request: FrontEndToBackEndRequest) : Promise<BackEndToFrontEndResponse | null> {
        let ret : Promise<BackEndToFrontEndResponse | null> ;

        let handler = this.cmdhandler_.get(request.request) ;
        if (handler) {
            ret = handler(request) ;
        }
        else {
            ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
                resolve({
                    response: 'error',
                    data: `No handler found for command: ${request.request}`
                }) ;
            }) ;
        }
        return ret;
    }    

    private bindCommandHandlers(): void {
        this.cmdhandler_.set('logMessage', this.logMessage.bind(this));
        this.cmdhandler_.set('setPlatform', this.setPlatform.bind(this));
        this.cmdhandler_.set('getBSPs', this.getBSPs.bind(this)) ;
        this.cmdhandler_.set('getCodeExamples', this.getCodeExamples.bind(this));
        this.cmdhandler_.set('createProject', this.createProject.bind(this));
        this.cmdhandler_.set('loadWorkspace', this.loadWorkspace.bind(this));
        this.cmdhandler_.set('fixMissingAssets', this.fixMissingAssets.bind(this)); 
        this.cmdhandler_.set('buildAction', this.runAction.bind(this)) ;
    }

    private runAction(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            this.apis_?.runAction(request.data.action, request.data.project)
            .then(() => {   
                resolve({
                    response: 'success',
                    data: null
                });
            }) ;
        });
        return ret;
    }

    private fixMissingAssets(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            if (this.apis_) {
                this.apis_.fixMissingAssets(request.data as string)
                    .then(() => {
                        this.env_?.reloadAppInfo()
                        .then(() => {
                            this.emit('updateAppStatus') ;
                            resolve({
                                response: 'success',
                                data: null
                            });
                        })
                        .catch((error) => {
                            this.logger_.error(`Error reloading app info after fixing assets: ${error.message}`);
                            resolve({
                                response: 'error',
                                data: `Error reloading app info after fixing assets: ${error.message}`
                            });
                        }) ;
                    })
                    .catch((error) => {
                        this.logger_.error(`Error fixing missing assets: ${error.message}`);
                        resolve({
                            response: 'error',
                            data: `Error fixing missing assets: ${error.message}`
                        });
                    });
            } else {
                resolve({
                    response: 'error',
                    data: 'Platform API is not initialized.'
                });
            }
        }) ;
        return ret ;
    }

    private convertCodeExamples(examples: MTBApp[]): CodeExampleIdentifier[] {
        let codeExamples: CodeExampleIdentifier[] = [];
        for(let example of examples) {
            if (!example.id || !example.name || !example.category) {
                this.logger_.warn(`Code example ${example.name} is missing required fields.`);
                continue;
            }
            codeExamples.push({
                id: example.id,
                name: example.name,
                category: example.category,
                description: example.description || ''
            });
        }
        return codeExamples;
    }

    private getCodeExamples(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            if (this.env_) {
                this.env_.manifestDB.getCodeExamplesForBSP(request.data.bspId)
                    .then((examples) => {
                        resolve({
                            response: 'setCodeExamples',
                            data: this.convertCodeExamples(examples)
                        });
                    })
                    .catch((error) => {
                        this.logger_.error(`Error retrieving code examples: ${error.message}`);
                        resolve({
                            response: 'error',
                            data: `Error retrieving code examples: ${error.message}`
                        });
                    });
                }
        });
        return ret;
    }

    private getBSPs(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null>  {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            this.bspsMgr.getDevKits()
                .then((kits) => {
                    resolve({
                        response: 'setBSPs',
                        data: kits}) ;
                })
                .catch((error) => {
                    this.logger_.error(`Error retrieving development kits: ${error.message}`);
                });
        }) ;
        return ret ;
    }

    private sendProgress(data: any) : void {
        this.emit('progress', data) ;
    }

    private loadedAsset(asset: string) : void {
        this.emit('loadedAsset', asset) ;
    }

    private setPlatform(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            let resp: BackEndToFrontEndResponse | null = null;

            if (request.data) {
                switch(request.data.platform as PlatformType) {
                    case 'browser':
                        this.apis_ = new BrowserAPI();
                        break ;

                    case 'vscode':
                        this.apis_ = new VSCodeAPI(this.logger_, this.env_!);
                        break;

                    case 'electron':
                        this.apis_ = new ElectronAPI();
                        break;

                    default:
                        this.logger_.error(`Unknown platform type: ${request.data}`) ;
                        resp = { response: 'error', data: `Unknown platform type: ${request.data}` };
                        break ;
                }
                if (this.apis_) {
                    this.apis_.on('progress', this.sendProgress.bind(this)); 
                    this.apis_.on('loadedAsset', this.loadedAsset.bind(this)) ;
                    this.apis_.on('runtask', this.runTask.bind(this)) ;
                }
            }
            else {
                this.logger_.error("setPlatform command received without platform type.") ;
                resp = { response: 'error', data: 'setPlatform: platform type is required.' };
            }

            resolve(resp) ;
        }) ;
        return ret ;
    }

    private runTask(task: string) {
        this.emit('runtask', task) ;
    }

    private loadWorkspace(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            if (this.apis_) {
                let projpath = path.join(request.data.path, request.data.project) ;
                this.apis_.loadWorkspace(projpath, request.data.project, request.data.example)
                    .then(() => {
                        resolve({
                            response: 'success',
                            data: null
                        });
                    })
                    .catch((error) => {
                        this.logger_.error(`Error loading workspace: ${error.message}`);
                        resolve({
                            response: 'error',
                            data: `Error loading workspace: ${error.message}`
                        });
                    });
            }
        });
        return ret;
    }

    private createProject(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            this.emit('showOutput') ;
            let fpath = path.join(request.data.location, request.data.name) ;
            if (!fs.existsSync(fpath)) {
                fs.mkdirSync(fpath, { recursive: true });
            }
            this.apis_!.createProject(request.data.location, request.data.name, request.data.bsp.id, request.data.example.id)
            .then(([status, messages]) => { 
                if (status === 0) {
                    resolve({
                        response: 'createProjectResult',
                        data: {
                            uuid: request.data.uuid,
                            success: true
                        }
                    });
                } else {
                    resolve({
                        response: 'createProjectResult',
                        data: {
                            uuid: request.data.uuid,
                            success: false,
                            message: messages.join('\n')
                        }
                    });
                }
            })
            .catch((error) => {
                this.logger_.error(`Error creating project: ${error.message}`);
                resolve({
                    response: 'error',
                    data: `Error creating project: ${error.message}`
                });
            });
        }) ;
        return ret;
    }

    private logMessage(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            let resp: BackEndToFrontEndResponse | null = null;

            let str = '' ;
            if (request.data && request.data.message) {
                if (typeof request.data.message === 'string') {
                    str = request.data.message;
                }
                else { 
                    str = JSON.stringify(request.data.message);
                }
            }

            if (str.length > 0) {
                let type = request.data.type || 'debug';
                switch(type) {
                    case 'info':
                        this.logger_.info('client:' + str);
                        break;
                    case 'warn':
                        this.logger_.warn('client:' + str);
                        break;
                    case 'error':
                        this.logger_.error('client:' + str);
                        break;
                    default:
                        this.logger_.log(type, 'client:' + str);
                        break;
                }
            }
            resolve(resp) ;
        }) ;
        return ret;
    }

} ;