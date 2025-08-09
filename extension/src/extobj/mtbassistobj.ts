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
import { ApplicationStatusData, BackEndToFrontEndResponse, Documentation, FrontEndToBackEndRequest, MemoryInfo, Middleware, Project, Tool } from '../comms';
import { MTBProjectInfo } from '../mtbenv/appdata/mtbprojinfo';
import { MTBAssetRequest } from '../mtbenv/appdata/mtbassetreq';
import { MTBTasks } from '../misc/mtbtasks';
import { browseropen } from '../browseropen';
import * as exec from 'child_process' ;

export class MTBAssistObject {
    private static readonly mtbLaunchUUID = 'f7378c77-8ea8-424b-8a47-7602c3882c49' ;
    private static readonly mtbLaunchToolName = 'mtblaunch' ;
    private static theInstance_: MTBAssistObject | undefined = undefined;

    private static readonly gettingStartedTab = 0 ;
    private static readonly createProjectTab = 1 ;
    private static readonly applicationStatusTab = 2 ;

    private context_: vscode.ExtensionContext;
    private channel_ ;
    private logger_ : winston.Logger ;
    private env_ : ModusToolboxEnvironment | null = null ; 
    private panel_: vscode.WebviewPanel | undefined = undefined;
    private content_ : vscode.WebviewPanel | undefined = undefined;
    private postInitDone_ : boolean = false;
    private envLoaded_ : boolean = false;
    private noMtbFound_ : boolean = false;
    private cmdhandler_ : Map<string, (data: any) => Promise<BackEndToFrontEndResponse | null>> = new Map();
    private projectInfo_ : Map<string, Project> = new Map() ;
    private meminfo_ : MemoryInfo[] = [] ;
    private tasks_ : MTBTasks | undefined = undefined ;

    // Managers
    private devkitMgr_: MTBDevKitMgr | undefined = undefined;

    private constructor(context: vscode.ExtensionContext) {
        this.context_ = context;
        this.channel_ = vscode.window.createOutputChannel("ModusToolbox") ;      

        let logstate = this.context_.globalState.get('logLevel', 'debug') ;

        this.logger_ = winston.createLogger({
            level: logstate,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.prettyPrint()
            ),
            transports: [
                new ConsoleTransport(),
                new VSCodeTransport(this.channel_),
            ]
        }) ;

        this.bindCommandHandlers() ;
    }

    public bringChannelToFront() {
        this.channel_.show(true);
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

    private reportProgress(data : any) {        
        if (this.panel_) {
            data.oobtype = 'progress' ;
            let oob: BackEndToFrontEndResponse = {
                response: 'oob',
                data: data
            } ;
            this.panel_.webview.postMessage(oob) ;
        }
    }

    private loadedAsset(asset: string) {
        if (this.panel_) {
            let oob: BackEndToFrontEndResponse = {
                response: 'oob',
                data: {
                    oobtype: 'loadedAsset',
                    asset: asset
                }
            };
            this.panel_.webview.postMessage(oob);
        }
    }

    private switchToTab(index: number) {
        if (this.panel_) {
            let oob: BackEndToFrontEndResponse = {
                response: 'oob',
                data: {
                    oobtype: 'selectTab',
                    index: index
                }
            };
            this.panel_.webview.postMessage(oob);
        }
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
                BackendService.getInstance().on('progress', this.reportProgress.bind(this));
                BackendService.getInstance().on('updateAppStatus', this.pushAppStatus.bind(this));
                BackendService.getInstance().on('loadedAsset', this.loadedAsset.bind(this));
                BackendService.getInstance().on('showOutput', this.bringChannelToFront.bind(this)); 
                BackendService.getInstance().on('runtask', this.runTask.bind(this));    
                this.loadMTBApplication().then(() => {
                    this.createAppStructure() ;
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
                                            if (this.env_ && this.env_.has(MTBLoadFlags.AppInfo) && this.env_.appInfo) {
                                                let p = path.join(this.env_.appInfo!.appdir, '.vscode', 'tasks.json') ;
                                                this.tasks_ = new MTBTasks(this.env_, this.logger_, p);
                                                this.switchToTab(MTBAssistObject.applicationStatusTab) ;
                                                this.getLaunchData()
                                                .then(() => {
                                                    this.logger_.info('Post-initialization of managers completed successfully.');
                                                    this.env?.load(MTBLoadFlags.Manifest)
                                                        .then(() => {
                                                            this.logger_.info('ModusToolbox manifests loaded successfully.');

                                                            //
                                                            // Now, we have have updated the application status so we do an OOB push
                                                            // of the application status so that the new information from MTBLaunch
                                                            // is picked up by the UI.
                                                            //
                                                            this.pushAppStatus() ;
                                                            this.updateAllTasks() ;
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
                                            }
                                            else {
                                                this.env?.load(MTBLoadFlags.Manifest)
                                                .then(() => {
                                                    this.logger_.info('ModusToolbox manifests loaded successfully.');
                                                    resolve() ;
                                                })
                                                .catch((error: Error) => {
                                                    this.logger_.error('Failed to load ModusToolbox manifests:', error.message);
                                                });
                                            }
                                        }) ;
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

    private runTask(task: string) {
        if (this.tasks_?.doesTaskExist(task)) {
            vscode.commands.executeCommand('workbench.action.tasks.runTask', task) ;
        }
        else {
            this.logger_.warn(`Task not found: ${task}`);
            vscode.window.showWarningMessage(`The requested task '${task}' does not exist.`);
            this.updateAllTasks() ;
        }
    }

    private bindCommandHandlers(): void {
        this.cmdhandler_.set('gettingStarted', this.gettingStarted.bind(this));
        this.cmdhandler_.set('documentation', this.documentation.bind(this));
        this.cmdhandler_.set('browseExamples', this.browseExamples.bind(this));
        this.cmdhandler_.set('community', this.community.bind(this));
        this.cmdhandler_.set('browseForFolder', this.browseFolder.bind(this));
        this.cmdhandler_.set('getAppStatus', this.getAppStatus.bind(this));
        this.cmdhandler_.set('open', this.open.bind(this)) ;
        this.cmdhandler_.set('libmgr', this.launchLibraryManager.bind(this)) ;
        this.cmdhandler_.set('tool', this.tool.bind(this)) ;
    }    

    private tool(request: any) : Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve, reject) => {
            let tool = this.getLaunchConfig(request.project ? request.project.name : '', request.tool.id);
            if (tool) {
                this.launch(tool) ;
            }
            resolve(null) ;
        });
        return ret;
    }

    static readonly libmgrProgUUID: string = 'd5e53262-9571-4d51-85db-1b47f98a0ff6' ;
    private getLaunchConfig(project: string, uuid: string) : Tool | undefined {
        let ret : Tool | undefined = undefined ;
            let pinfo = this.projectInfo_.get(project) ;
            if (pinfo) {
                ret = pinfo.tools.find((t) => t.id === uuid);
            }        
        return ret;
    }

    private launch(tool: Tool) {
        let cfg = tool.launchData ;

        let args: string[] = [] ;
        for(let i = 0 ; i < cfg.cmdline.length ; i++) {
            if (i !== 0) {
                args.push(cfg.cmdline[i]) ;
            }
        }
        vscode.window.showInformationMessage("Starting program '" + cfg.shortName) ;

        let envobj : any = {} ;
        for(let key of Object.keys(process.env)) {
            if (key.indexOf("ELECTRON") === -1) {
                envobj[key] = process.env[key] ;
            }
        }

        exec.execFile(cfg.cmdline[0], 
            args, 
            { 
                cwd: this.env_?.appInfo?.appdir,
                env: envobj
            }, (error, stdout, stderr) => 
            {
                if (error) {
                    vscode.window.showErrorMessage(error.message) ;
                }
                this.pushAppStatus() ;
            }
        );        
    }

    private launchLibraryManager(request: any) : Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve, reject) => {
            let tool = this.getLaunchConfig('', MTBAssistObject.libmgrProgUUID);
            if (tool) {
                this.launch(tool) ;
            }
            resolve(null) ;
        });
        return ret;
    }

    private open(request: any) : Promise<BackEndToFrontEndResponse | null> {
        let ret = new Promise<BackEndToFrontEndResponse | null>((resolve, reject) => {
            browseropen(request.location) ;
            resolve(null) ;
        });
        return ret;
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


    private mtbLaunchPath() : string | undefined {
        let tool = this.env_!.toolsDB.findToolByGUID(MTBAssistObject.mtbLaunchUUID);
        if (tool === undefined) {
            return undefined;
        }

        return path.join(tool.path, MTBAssistObject.mtbLaunchToolName);
    }

    private addLaunch(proj: string, cfg: any) {
        let pinfo = this.projectInfo_.get(proj) ;
        if (!pinfo) {
            return ;
        }

        pinfo.tools = pinfo.tools.filter(tool => tool.id !== cfg.id);
        let tool : Tool = {
            name: cfg['display-name'],
            id: cfg.id,
            version: cfg.version,
            launchData: cfg
        } ;
        pinfo.tools.push(tool) ;
    }

    private addDoc(proj: string, cfg: any) {
        let pinfo = this.projectInfo_.get(proj) ;
        if (!pinfo) {
            return ;
        }

        pinfo.documentation = pinfo.documentation.filter(doc => doc.location !== cfg.location);
        let doc: Documentation = {
            name: cfg.title,
            location: cfg.location,
        } ;
        pinfo.documentation.push(doc) ;
    }

    private procesMtbLaunchData(data: any) {
        if (data && data.configs && Array.isArray(data.configs)) {
            for(let cfg of data.configs) {
                if (cfg.scope) {
                    if (cfg.scope === 'global' || cfg.scope === 'bsp') {
                        this.addLaunch('', cfg) ;
                    }
                    else if (cfg.scope === 'project') {
                        this.addLaunch(cfg.project, cfg) ;
                    }
                }
            }
        }

        if (data && data.documentation && Array.isArray(data.documentation)) {
            for(let cfg of data.documentation) {
                if (cfg.project === '') {
                    this.addDoc('', cfg) ;
                }
                else {
                    this.addDoc(cfg.project, cfg) ;
                }
            }
        }
    }

    private async getLaunchData() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let cwd = process.cwd() ;
            let cmd = this.mtbLaunchPath() ;
            if (!cmd) {
                this.logger_.error('mtblaunch tool not found - cannot get launch data.');
                resolve() ;
                return;
            }

            ModusToolboxEnvironment.runCmdCaptureOutput(cwd, cmd, ['--quick', '--docs', '--app', this.env_!.appInfo!.appdir])
            .then((result) => {
                if (result[0] !== 0) {
                    this.logger_.debug(`mtblaunch output: ${result[1].join('\n')}`);
                    resolve() ;
                }
                else {
                    try {
                        let str = result[1].join('\n') ;
                        if (str.startsWith('//')) {
                            str = str.substring(2).trim() ; // Remove leading comment slashes
                        }
                        let obj = JSON.parse(str) ;
                        this.procesMtbLaunchData(obj);
                    } catch (error) {
                        let errobj = error as Error;
                        this.logger_.error('Error parsing mtblaunch output:', errobj.message);
                    }
                    resolve() ;
                }
            }) ;
        }) ;
        return ret;
    }

    private getMiddlewareFromEnv(proj: MTBProjectInfo) : Middleware[] {
        let ret: Middleware[] = [] ;
        let a : MTBAssetRequest ;
        for(let asset of proj.assetsRequests) {
            let newer = false ;
            let item = this.env_!.manifestDB.findItemByID(asset.repoName()) ;
            if (item) {
                let versions = item.newerVersions(asset.commit()) ;
                if (versions.length > 0) {
                    newer = true ;
                }
            }
            let mw: Middleware = {
                name: asset.repoName(),
                version: asset.commit(),
                newer: newer
            } ;
            ret.push(mw) ;
        }
        return ret ;
    }

    private createAppStructure() {
        if (!this.env_ || !this.env_.has(MTBLoadFlags.AppInfo)) {
            this.logger_.debug('No ModusToolbox application info found - cannot create app structure.');
            return;
        }

        for(let proj of this.env_!.appInfo!.projects || []) {
            let project: Project = {
                name: proj.name,
                documentation: [],
                middleware: this.getMiddlewareFromEnv(proj),
                tools: [],
                missingAssets: proj.missingAssets.length > 0,
                missingAssetDetails: proj.missingAssets.map((asset) => asset.name())
            };
            this.projectInfo_.set(proj.name, project);
        }

        this.projectInfo_.set('', {
            name: '',
            documentation: [],
            middleware: [],
            tools: [],
            missingAssets: false,
            missingAssetDetails: [],
        });
    }

    private pushAppStatus() {
        if (this.panel_) {
            let st = this.getAppStatusFromEnv() as any ;
            st.oobtype = 'appStatus' ;
            let oob: BackEndToFrontEndResponse = {
                response: 'oob',
                data: st
            } ;
            this.panel_.webview.postMessage(oob) ;
        }
    }

    private getAppStatusFromEnv() : ApplicationStatusData  {
        let appst : ApplicationStatusData ;        
        if (this.env_ && this.env_.has(MTBLoadFlags.AppInfo)) {
            let pinfo = this.projectInfo_.get('') ;

            let projects = [...this.projectInfo_.values()].filter((proj) => proj.name !== '').sort((a, b) => a.name.localeCompare(b.name)) ;
            for(let p of projects) {
                let envp = this.env_!.appInfo!.projects?.find((proj) => proj.name === p.name) ;
                if (envp) {
                    p.missingAssets = envp.missingAssets.length > 0 ;
                    p.missingAssetDetails = envp.missingAssets.map((asset) => asset.name()) ;
                    p.middleware = this.getMiddlewareFromEnv(envp) ;
                }
            }
            
            this.logger_.debug(`Found ${projects.length} projects in the application.`) ;
            appst = {
                valid: true,
                name: this.env_.appInfo?.appdir || '',
                memory: this.meminfo_,
                documentation: pinfo?.documentation || [],
                middleware: [],
                projects: projects,
                tools: pinfo?.tools || [],
            } ;
        } else {
            appst = {
                valid: false,
                name : '',
                memory: [],
                documentation: [],
                middleware: [],
                projects: [],
                tools: [],
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
                    if (response) {
                        this.logger_.debug(`Response for request ${message.request}: ${str}`);                        
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

    private updateAllTasks() {
        if (this.tasks_) {
            if (!this.tasks_.isValid()) {
                vscode.window.showInformationMessage("The file 'tasks.json' is not a valid tasks file (or does not exist) and cannot be parsed as JSONC. Do you want to recreate this file with the default tasks?", "Yes", "No")
                    .then((answer) => {
                        if (answer === "Yes") {
                            this.tasks_!.reset() ;
                            this.tasks_!.addAll() ;
                            this.tasks_!.writeTasks() ;
                        }
                    }) ;
            }
            else if (this.tasks_.doWeNeedTaskUpdates()) {
                vscode.window.showInformationMessage("The ModusToolbox Assistant works best with a specific set of tasks for the application and the projects.  This may add or change existing tasks.  Do you want to make these changes?", "Yes", "No")
                    .then((answer) => {
                        if (answer === "Yes") {
                            this.tasks_!.addAll() ;
                            this.tasks_!.writeTasks() ;
                        }
                    }) ;
            }
        }         
    }    
}
