import * as vscode from 'vscode';
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';
import { VSCodeTransport } from './vscodetransport';
import { ConsoleTransport } from './consoletransport';
import { ModusToolboxEnvironment } from '../mtbenv/mtbenv/mtbenv';
import { MTBLoadFlags } from '../mtbenv/mtbenv/loadflags';
import { MTBDevKitMgr } from '../devkits/mtbdevkitmgr';
import { BackendService } from '../backend/backend';
import { BackEndToFrontEndResponse, FrontEndToBackEndRequest } from '../comms';

export class MTBAssistObject {
    private static theInstance_: MTBAssistObject | undefined = undefined;

    private context_: vscode.ExtensionContext;
    private logger_ : winston.Logger ;
    private env_ : ModusToolboxEnvironment | null = null ; 
    private panel_: vscode.WebviewPanel | undefined = undefined;
    private content_ : vscode.WebviewPanel | undefined = undefined;
    private postInitDone_ : boolean = false;
    private envLoaded_ : boolean = false;
    private noMtbFound_ : boolean = false;
    private cmdhandler_ : Map<string, (request: FrontEndToBackEndRequest) => Promise<BackEndToFrontEndResponse | null>> = new Map();    

    // Managers
    private devkitMgr_: MTBDevKitMgr | undefined = undefined;

    private constructor(context: vscode.ExtensionContext) {
        this.context_ = context;
        let logstate = this.context_.globalState.get('logLevel', 'debug') ;

        this.logger_ = winston.createLogger({
            level: logstate,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.prettyPrint()
            ),
            transports: [
                new ConsoleTransport(),
                new VSCodeTransport(),
            ]
        }) ;

        this.bindCommandHandlers() ;
    }

    public get noMTBFound() : boolean {
        return this.noMtbFound_ ;
    }

    public get mgrsInitialized() : boolean {
        return this.postInitDone_ ;
    }

    public get mtbEnvLoaded() : boolean {
        return this.envLoaded_ ;
    }

    public async initialize() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.env_ = ModusToolboxEnvironment.getInstance(this.logger_) ;
            if (!this.env_) {
                this.logger_.error('Failed to initialize ModusToolbox environment.');
                return;
            }

            BackendService.initInstance(this.logger_, this.context_.extensionUri, this.env_) ;            
            if (this.env_.defaultToolsDir === undefined) {
                this.noMtbFound_ = true ;
                this.noMTBInstalled() ;
                resolve() ;
            }
            else {
                this.loadMTBApplication().then(() => {
                    this.logger_.info('MTB Application loaded successfully.');
                    this.preInitializeManagers()
                        .then(() => {
                            this.logger_.info('All managers initialized successfully.');
                            this.initializeCommands();
                            vscode.commands.executeCommand('mtbassist.mtbMainPage')
                                .then(() => {
                                    this.logger_.debug('Welcome page command executed successfully.');
                                    this.postInitializeManagers()
                                        .then(() => {
                                            this.logger_.info('Post-initialization of managers completed successfully.');
                                            this.env?.load(MTBLoadFlags.Manifest)
                                                .then(() => {
                                                    this.logger_.info('ModusToolbox manifests loaded successfully.');
                                                    resolve();
                                                })
                                                .catch((error: Error) => {
                                                    this.logger_.error('Failed to load manifest files:', error.message);
                                                    resolve() ;
                                                });
                                        })
                                        .catch((error: Error) => {
                                            this.logger_.error('Error during post-initialization of managers:', error.message);
                                        });
                                }) ;
                        })
                        .catch((error: Error) => {
                            this.logger_.error('Failed to initialize MTBDevKitMgr:', error.message);
                        });

                }) ;
            }
        }) ;

        return ret;
    }

    public get context() : vscode.ExtensionContext {
        return this.context_ ;
    }

    public get env() : ModusToolboxEnvironment | null {
        if (!this.env_) {
            return null ;
        }

        if (this.env_.isLoading) {
            return null ;
        }
        return this.env_ ;
    }

    public get logger() : winston.Logger {
        return this.logger_ ;       
    }

    public static initInstance(context: vscode.ExtensionContext): MTBAssistObject {
        if (MTBAssistObject.theInstance_) {
            throw new Error('MTBAssistObject is already initialized - cannot be initialized more than once.');
        }

        MTBAssistObject.theInstance_ = new MTBAssistObject(context);
        MTBAssistObject.theInstance_.initialize()
            .then(() => {
                MTBAssistObject.theInstance_!.logger.info('MTBAssistObject initialized successfully.');
            })
            .catch((error: Error) => {
                MTBAssistObject.theInstance_!.logger.error('Failed to initialize MTBAssistObject:', error.message);
            });
        //
        // Note, this might not be fully initialized yet, but we return the instance anyway.
        // The users of the object must be sure its ready before using it.
        //
        return MTBAssistObject.theInstance_;
    }

    public static getInstance(): MTBAssistObject {
        if (!MTBAssistObject.theInstance_) {
            throw new Error('MTBAssistObject is not initialized - call initInstance first.');
        }
        return MTBAssistObject.theInstance_;
    }

    private bindCommandHandlers(): void {
        this.cmdhandler_.set('gettingStarted', this.gettingStarted.bind(this));
        this.cmdhandler_.set('documentation', this.documentation.bind(this));
        this.cmdhandler_.set('browseExamples', this.browseExamples.bind(this));
        this.cmdhandler_.set('community', this.community.bind(this));
        this.cmdhandler_.set('browseForFolder', this.browseFolder.bind(this));
    }    

    private noMTBInstalled() {
        let disposable: vscode.Disposable;

        this.logger_.info('ModusToolbox is not installed or not found in the expected location.');
        this.env_ = null ;

	    disposable = vscode.commands.registerCommand('mtbassist.mtbMainPage', this.noMTBFoundDisplay.bind(this));
        this.context_.subscriptions.push(disposable);

        if (this.context_.globalState.get('noModusPage', true)) {
            vscode.commands.executeCommand('mtbassist.mtbMainPage') ;
        }
    }

    private preInitializeManagers() : Promise<void> {    
        let promise = new Promise<void>((resolve, reject) => {
            resolve() ;
        }) ;
        return promise ;
    }

    private postInitializeManagers() : Promise<void> {
        let promise = new Promise<void>((resolve, reject) => {
            this.devkitMgr_ = new MTBDevKitMgr(this);
            this.devkitMgr_.init()
                .then(() => {
                    this.postInitDone_ = true ;
                    this.logger_.info('MTBDevKitMgr initialized successfully.');
                    resolve();
                })
                .catch((error: Error) => {
                    this.logger_.error('Failed to initialize MTBDevKitMgr:', error.message);
                    reject(error);
                });
        });

        return promise;
    }

    private initializeCommands() {
        let disposable: vscode.Disposable;

	    disposable = vscode.commands.registerCommand('mtbassist.mtbMainPage', this.mtbMainPage.bind(this));
        this.context_.subscriptions.push(disposable);
    }

    private isPossibleMTBApplication(): boolean {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            this.logger_.debug('no workspace folders found - can not be a ModusToolbox application.') ;
            return false;
        }

        let makepath1 = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'makefile');
        let makepath2 = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'Makefile');

        if (!fs.existsSync(makepath1) && !fs.existsSync(makepath2)) {
            this.logger_.debug('no makefile found in the workspace root - cannot be a ModusToolbox application.');
            return false;
        }

        return true ;
    }

    private mtbApplicationDirectory() : string | undefined {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            this.logger_.debug('no workspace folders found - cannot determine ModusToolbox application directory.') ;
            return undefined;
        }
        let workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        return workspaceFolder;
    }

    private loadMTBApplication(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.isPossibleMTBApplication()) {
                this.logger_.debug('Not a ModusToolbox application - skipping loading app.');
                let flags: MTBLoadFlags = MTBLoadFlags.Packs | MTBLoadFlags.Tools ;
                this.env_!.load(flags).then(() => {
                    this.envLoaded_ = true ;
                    this.logger_.info('ModusToolbox environment with no application loaded successfully.');
                    resolve();
                }).catch((error: Error) => {
                    this.logger_.error('Failed to load ModusToolbox environment with no application:', error.message);
                    reject(error);
                });
            }
            else {
                let appDir = this.mtbApplicationDirectory();
                if (!appDir) {
                    this.logger_.error('Could not determine ModusToolbox application directory.');
                    reject(new Error('ModusToolbox application directory not found.'));
                    return;
                }

                this.logger_.debug('ModusToolbox application detected - loading...');
                //
                // Load the ModusToolbox application w/ packs and tools
                //
                let flags: MTBLoadFlags = MTBLoadFlags.AppInfo | MTBLoadFlags.Packs | MTBLoadFlags.Tools ;
                this.env_!.load(flags, appDir).then(() => {
                    this.envLoaded_ = true ;
                    this.logger_.info('ModusToolbox application loaded successfully.');
                    resolve();
                }).catch((error: Error) => {
                    this.logger_.error('Failed to load ModusToolbox application:', error.message);
                    reject(error);
                });
            }
        });
    }

    private mtbMainPage(args: any[]) {
        this.logger_.info('Showing ModusToolbox main page.');
        this.showLocalContent('single-dist/index.html') ;
    }

    private noMTBFoundDisplay(args: any[]) {
        this.logger_.info('No ModusToolbox installation found.');
        this.showLocalContent('nomtb.html');
        let state = this.context_.globalState.get('noModusPage', true);
        this.panel_!.webview.postMessage({
            command: 'noModusPage',
            showNoModusPage: state
        });
    }

    private showWebContentEmbedded(uri: vscode.Uri) {
        if (!this.content_) {
            this.content_ = vscode.window.createWebviewPanel(
                'mtbassist.content',
                'ModusToolbox Assistant',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                }
            );
        }

        let str = `<!DOCTYPE html>
                    <html lang='en'>
                        <head>
                            <meta charset='UTF-8'>
                            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                            <meta http-equiv="Content-Security-Policy" content="default-src 'none';">                            
                            <title>ModusToolbox Content</title>
                        </head>
                        <body>
                            <iframe src='${uri.toString()}' style='width: 100%; height: 100vh; border: none;'></iframe>
                        </body>
                    </html>`;
        this.content_.webview.html = str;

        this.content_.onDidDispose(() => {
            this.content_ = undefined;
        }, null, this.context_.subscriptions);        
    }

    private showWebContentExternal(uri: vscode.Uri) {
        vscode.env.openExternal(uri) ;
    }

    private showWebContent(uri: vscode.Uri) {
        this.showWebContentExternal(uri) ;
    }

    private showLocalContent(filename: string) {
        let p: string = path.join(this.context_.extensionUri.fsPath, 'content', filename);
        let fullpath: vscode.Uri = vscode.Uri.file(p);

        if (!this.panel_) {
            this.panel_ = vscode.window.createWebviewPanel(
                'mtbassist.welcome',
                'ModusToolbox Assistant',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                }
            );
        }

        let data = fs.readFileSync(fullpath.fsPath, 'utf8'); 
        this.panel_.webview.html = data;

        this.panel_.onDidDispose(() => {
            this.panel_ = undefined;
        }, null, this.context_.subscriptions);

        this.panel_.webview.onDidReceiveMessage((message) => {
            if (message.request === 'platformSpecific') {
                this.logger_.debug(`Received platformSpecific request: ${JSON.stringify(message.data)}`);
                if (this.cmdhandler_.has(message.data.command)) {
                    this.cmdhandler_.get(message.data.command)!(message.data.data)
                    .then((response: BackEndToFrontEndResponse | null) => {
                        this.logger_.debug(`Response for platform specific command ${message.data.command}: ${JSON.stringify(response)}`);
                        if (response) {
                            this.panel_!.webview.postMessage(response);
                        }
                    })
                    .catch((error: Error) => {
                        this.logger_.error(`Error handling command ${message.data.command}: ${error.message}`);
                    }) ;
                } else {
                    this.logger_.error(`No handler found for vscode command: ${message.data.command}`);
                }
            }
            else {
                let be = BackendService.getInstance() ;
                be.processRequest(message)
                .then((response: BackEndToFrontEndResponse | null) => {
                    let str = JSON.stringify(response) ;
                    if (str.length > 128) {
                        str = str.substring(0, 128) + '...' ;
                    }
                    this.logger_.debug(`Response for request ${message.request}: ${str}`);
                    if (response) {
                        this.panel_!.webview.postMessage(response);
                    }
                }) ;
            }
        }) ;
    }

    private gettingStarted(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            let resp: BackEndToFrontEndResponse = { response: 'success', data: null };
            this.showWebContent(vscode.Uri.parse('https://infineon-academy.csod.com/ui/lms-learning-details/app/video/aca8371d-45ae-4688-9289-e19c22057636'));
            resolve(resp);
        }) ;
        return ret;
    }

    private documentation(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            let resp: BackEndToFrontEndResponse = { response: 'success', data: null };
            this.showWebContent(vscode.Uri.parse('https://documentation.infineon.com/modustoolbox/docs/zhf1731521206417'));
            resolve(resp);
        }) ;
        return ret;
    }

    private browseExamples(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            let resp: BackEndToFrontEndResponse = { response: 'success', data: null };
            this.showWebContent(vscode.Uri.parse('https://github.com/Infineon/Code-Examples-for-ModusToolbox-Software'));
            resolve(resp);
        }) ;
        return ret;
    }

    private community(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            let resp: BackEndToFrontEndResponse = { response: 'success', data: null };
            this.showWebContent(vscode.Uri.parse('https://community.infineon.com/t5/ModusToolbox/bd-p/modustoolboxforum/'));
            resolve(resp);
        }) ;
        return ret;
    }

    private browseFolder(request: FrontEndToBackEndRequest): Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve) => {
            vscode.window.showOpenDialog({
                canSelectMany: false,
                openLabel: 'Select Folder For New Project',
                canSelectFiles: false,
                canSelectFolders: true
            }).then((uri) => {
                let resp: BackEndToFrontEndResponse ;
                if (!uri || uri.length === 0) {
                    this.logger_.debug('No folder selected in browseFolder dialog.');
                    resp = { response: 'error', data: 'No folder selected.' };
                }
                else {
                    resp = { response: 'browseForFolderResult', data: uri[0].fsPath };
                }
                resolve(resp) ;
            }) ;
        }) ;
        return ret;
    }
}

