import { ModusToolboxEnvironment } from "../mtbenv/mtbenv/mtbenv";
import { URI } from "vscode-uri";
import { BrowserAPI } from "./platform/browserapi";
import { VSCodeAPI } from "./platform/vscodeapi";
import { ElectronAPI } from "./platform/electronapi";
import { BackEndToFrontEndResponse, CodeExampleIdentifier, FrontEndToBackEndRequest, PlatformType } from "../comms";
import { BSPMgr } from "./bspmgr";
import { MTBApp } from "../mtbenv/manifest/mtbapp";
import * as winston from 'winston';
import { PlatformAPI } from "./platform/platformapi";

export class BackendService {
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

    private setPlatform(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            let resp: BackEndToFrontEndResponse | null = null;

            if (request.data) {
                switch(request.data as PlatformType) {
                    case 'browser':
                        this.apis_ = new BrowserAPI();
                        break ;

                    case 'vscode':
                        this.apis_ = new VSCodeAPI(this.env_!);
                        break;

                    case 'electron':
                        this.apis_ = new ElectronAPI();
                        break;

                    default:
                        this.logger_.error(`Unknown platform type: ${request.data}`) ;
                        resp = { response: 'error', data: `Unknown platform type: ${request.data}` };
                        break ;
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

    private createProject(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            this.apis_!.createProject(request.data.location, request.data.appdir, request.data.bspid, request.data.ceid)
            .then(([status, messages]) => { 
                if (status === 0) {
                    resolve({
                        response: 'success',
                        data: messages
                    });
                } else {
                    resolve({
                        response: 'error',
                        data: messages.join('\n')
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