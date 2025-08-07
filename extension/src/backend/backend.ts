import { ModusToolboxEnvironment } from "../mtbenv/mtbenv/mtbenv";
import { URI } from "vscode-uri";
import { BrowserAPI } from "./platform/browserapi";
import { VSCodeAPI } from "./platform/vscodeapi";
import { ElectronAPI } from "./platform/electronapi";
import { ApplicationStatusData, BackEndToFrontEndResponse, CodeExampleIdentifier, Document, Documentation, FrontEndToBackEndRequest, MemoryInfo, Middleware, PlatformType, Project, ProjectInfo } from "../comms";
import { BSPMgr } from "./bspmgr";
import { MTBApp } from "../mtbenv/manifest/mtbapp";
import { PlatformAPI } from "./platform/platformapi";
import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from "stream";
import { MTBLoadFlags } from "../mtbenv";

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
        this.cmdhandler_.set('getDevKits', this.getDevKits.bind(this)) ;
        this.cmdhandler_.set('getCodeExamples', this.getCodeExamples.bind(this));
        this.cmdhandler_.set('createProject', this.createProject.bind(this));
        this.cmdhandler_.set('loadWorkspace', this.loadWorkspace.bind(this));
        this.cmdhandler_.set('getAppStatus', this.getAppStatus.bind(this));
    }

    private getAppStatusFromEnv() : ApplicationStatusData  {
        let appst : ApplicationStatusData ;        
        if (this.env_ && this.env_.has(MTBLoadFlags.AppInfo)) {
            let mem : MemoryInfo[] = [] ;
            let docs: Documentation[] = [] ;
            let projs : Project[] = [] ;
            let middleware: Middleware[] = [] ;

            for(let p of this.env_.appInfo?.projects || []) {
                let proj: Project = {
                    name: p.name,
                    documentation: [],
                    middleware: [],
                    tools: [],
                };
                projs.push(proj);
            }

            appst = {
                valid: true,
                name: this.env_.appInfo?.appdir || '',
                memory: mem,
                documentation: docs,
                middleware: middleware,
                projects: projs,
            } ;
        } else {
            appst = {
                valid: false,
                name : '',
                memory: [],
                documentation: [],
                middleware: [],
                projects: []
            };
        }
        return appst ;
    }
                
    private getAppStatus(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            if (this.env_ && this.env_.isLoading) {
                this.env_.on('loaded', () => {
                    resolve({
                        response: 'appStatusResult',
                        data: this.getAppStatusFromEnv()
                    }) ;                    
                }) ;
            }
            else {
                resolve({
                    response: 'appStatusResult',
                    data: this.getAppStatusFromEnv()
                }) ;
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

    private getDevKits(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null>  {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            this.bspsMgr.getDevKits()
                .then((kits) => {
                    resolve({
                        response: 'setDevKits',
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

    private loadWorkspace(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            if (this.apis_) {
                this.apis_.loadWorkspace(request.data.path, request.data.project)
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

            if (request.data && typeof request.data === 'string') {
                this.logger_.info('client:' + request.data) ;
            } else if (typeof request.data === 'object' && ('level' in request.data) && ('message' in request.data)) {
                this.logger_.log(request.data.level, request.data.message) ;
            } else if (request.data) {
                this.logger_.info(`client: ${JSON.stringify(request.data)}`) ;
            } else {
                this.logger_.info('client: no message provided') ;
                resp = { response: 'error', data: 'logMessage: No message provided.' };
            }
            resolve(resp) ;
        }) ;
        return ret;
    }

} ;