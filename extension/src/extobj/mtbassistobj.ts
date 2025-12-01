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


import * as vscode from 'vscode';
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as mdit from 'markdown-it';
import { VSCodeTransport } from './vscodetransport';
import { ConsoleTransport } from './consoletransport';
import { ModusToolboxEnvironment, MTBRunCommandOptions } from '../mtbenv/mtbenv/mtbenv';
import { MTBLoadFlags } from '../mtbenv/mtbenv/loadflags';
import { MTBDevKitMgr } from '../devkits/mtbdevkitmgr';
import {
    ApplicationStatusData, BackEndToFrontEndResponse, BackEndToFrontEndType, BSPIdentifier, CodeExampleIdentifier, ComponentInfo, Documentation,
    FrontEndToBackEndRequest, FrontEndToBackEndType, GlossaryEntry, InstallProgress, LCSBSPKeywordAliases, ManifestStatusType, Middleware, MTBAssistantMode, 
    MTBAssistantTask, 
    MTBLocationStatus, MTBSetting, MTBVSCodeSettingsStatus, MTBVSCodeTaskStatus, Project, ProjectGitStateTrackerData, SettingsError, ThemeType, Tool
} from '../comms';
import { MTBProjectInfo } from '../mtbenv/appdata/mtbprojinfo';
import { MTBAssetRequest } from '../mtbenv/appdata/mtbassetreq';
import * as exec from 'child_process';
import { RecentAppManager } from './mtbrecent';
import { IntelliSenseMgr } from './intellisense';
import { SetupMgr } from '../setup/setupmgr';
import { MTBApp } from '../mtbenv/manifest/mtbapp';
import { TaskToRun, VSCodeWorker } from './vscodeworker';
import { MtbFunIndex } from '../keywords/mtbfunindex';
import { MTBSettings } from './mtbsettings';
import { LCSManager } from './lcsmgr';
import { MemoryUsageMgr } from '../memory/memusage';
import { DeviceDBManager } from '../devdb/devdbmgr';
import { MTBVSCodeSettings } from './mtbvscodesettings';
import { MTBVersion } from '../mtbenv/misc/mtbversion';
import { LLVMInstaller } from './llvminstaller';
import { AddBootloaderTask } from '../stasks/addbootloader';
import { STask } from '../stasks/stask';
import { VSCodeTasks } from '../vscodetasks/vscodetasks';
import { VSCodeAppTaskGenerator } from '../vscodetasks/vscodeapptaskgen';
import { VSCodeProjTaskGenerator } from '../vscodetasks/vscodeprojtaskgen';
import { RunTimeTracker } from '../runtime';
import fetch from 'node-fetch';
import { ApplicationType } from '../mtbenv/appdata/mtbappinfo';
import { browseropen } from '../browseropen';

export class MTBAssistObject {
    private static readonly mtbLaunchUUID = 'f7378c77-8ea8-424b-8a47-7602c3882c49';
    private static readonly mtbLaunchToolName = 'mtblaunch';
    private static theInstance_: MTBAssistObject | undefined = undefined;
    private static readonly libmgrProgUUID: string = 'd5e53262-9571-4d51-85db-1b47f98a0ff6';
    private static readonly devcfgProgUUID: string = '45159e28-aab0-4fee-af1e-08dcb3a8c4fd';
    private static readonly modusShellUUID: string = '0afffb32-ea89-4f58-9ee8-6950d44cb004';
    private static readonly setupPgmUUID: string = '14ca45f3-863f-4a4c-8e55-9a14bd1e1ee5';
    private static readonly setupPgmToolName: string = 'com.ifx.tb.tool.modustoolboxsetup';
    private static readonly projectCreatorUUID: string = '2b5ece6f-0a04-4a6f-a683-de5e3dc0a060';
    private static readonly lastProjectPath: string = 'lastProjectPath' ;
    private static readonly bootloaderDocUrl: string = 'https://www.mewserver.org/vscode/bootloader.md' ;

    /** UUID identifier for the GCC toolchain in the ModusToolbox tools database */
    private static readonly gccUUID = '8472a194-a4ec-4c1b-bfda-b6fca90b3f0d' ;    

    private static readonly gettingStartedTab = 0;
    private static readonly createProjectTab = 1;
    private static readonly recentlyOpenedTab = 2;
    private static readonly applicationStatusTab = 3;
    private static readonly devkitListTab = 4;

    private foundVeneerProblem: boolean = false ;

    private context_: vscode.ExtensionContext;
    private channel_: vscode.OutputChannel;
    private logger_: winston.Logger;
    private commandsInited_: boolean = false;
    private env_: ModusToolboxEnvironment | null = null;
    private panel_: vscode.WebviewPanel | undefined = undefined;
    private content_: vscode.WebviewPanel | undefined = undefined;
    private showContentExternal_: boolean = true ;
    private postInitDone_: boolean = false;
    private envLoaded_: boolean = false;
    private cmdhandler_: Map<FrontEndToBackEndType, (data: any) => Promise<void>> = new Map();
    private llvminstaller_: LLVMInstaller ;
    private memusage_ : MemoryUsageMgr ;
    private devicedb_ : DeviceDBManager | undefined = undefined ;
    private projectInfo_: Map<string, Project> = new Map();
    private tasks_:Map<string, VSCodeTasks> = new Map();
    private vscodeSettings_ : MTBVSCodeSettings | undefined = undefined;
    private recents_: RecentAppManager | undefined = undefined;
    private intellisense_: IntelliSenseMgr | undefined = undefined;
    private setupMgr_: SetupMgr;
    private lcsMgr_: LCSManager | undefined;
    private worker_: VSCodeWorker | undefined;
    private launchTimer: NodeJS.Timer | undefined = undefined;
    private mtbmode_: MTBAssistantMode = 'initializing' ;
    private compDescMap_: Map<string, string> = new Map();
    private keywords_: MtbFunIndex;
    private toolspath_: string | undefined;
    private settings_: MTBSettings;
    private termRegistered_: boolean = false;
    private ready_ : boolean = false ;
    private theme_ : ThemeType = 'light';
    private intellisenseProject_ : string | undefined ;
    private manifestStatus_ : ManifestStatusType = 'loading';
    private pendingPasswordPromise: ((pass: string | undefined) => void) | undefined = undefined ;
    private pendingStatusClosePromise: (() => void) | undefined = undefined ;
    private activeTask_ : STask | undefined = undefined ;
    private password? : string ;

    // Managers
    private devkitMgr_: MTBDevKitMgr | undefined = undefined;

    private constructor(context: vscode.ExtensionContext) {
        this.context_ = context;
        this.channel_ = vscode.window.createOutputChannel("ModusToolbox");

        let logstate = this.context_.globalState.get('logLevel', 'debug');

        this.logger_ = winston.createLogger({
            level: logstate,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.prettyPrint()
            ),
            transports: [
                new VSCodeTransport(this.channel_),
            ]
        });

        this.llvminstaller_ = new LLVMInstaller(this.logger_) ;
        this.llvminstaller_.on('progress', (msg) => {
            this.sendMessageWithArgs('installLLVMMessage', msg);
        });

        this.recents_ = new RecentAppManager(this);

        this.intellisense_ = new IntelliSenseMgr(this);

        this.setupMgr_ = new SetupMgr(this);
        this.setupMgr_.on('downloadProgress', this.reportInstallProgress.bind(this));
        this.setupMgr_.on('addStatusLine', (line: string) => {
            this.sendMessageWithArgs('addStatusLine', line);
        });
        this.keywords_ = new MtbFunIndex(this.logger_);

        this.settings_ = new MTBSettings(this);
        this.settings_.on('toolsPathChanged', this.onToolsPathChanged.bind(this));
        this.settings_.on('restartWorkspace', this.doRestartExtension.bind(this));
        this.settings_.on('showError', this.showSettingsError.bind(this));
        this.settings_.on('refresh', () => { this.sendMessageWithArgs('settings', this.settings_.settings); });
        this.settings_.on('updateTasks', () => { this.tasks_.forEach(task => task.addRequiredTasks()); }); ;
        this.settings_.on('updateAppStatus', () => { this.sendMessageWithArgs('appStatus', this.getAppStatusFromEnv()); }); ;

        this.memusage_ = new MemoryUsageMgr(this) ;
        vscode.tasks.onDidEndTask((e) => { 
            this.taskEnd(e) ;
        }) ;


        this.toolspath_ = this.findToolsPath() ;
        this.bindCommandHandlers();

        vscode.window.onDidChangeActiveColorTheme(e => {
            this.sendTheme();
        });

        this.computeTheme() ;
        vscode.window.onDidStartTerminalShellExecution((e: vscode.TerminalShellExecutionStartEvent) => {   
            this.terminalStarted(e) ;
        });

        vscode.window.onDidEndTerminalShellExecution((e: vscode.TerminalShellExecutionEndEvent) => {   
            this.terminalEnded(e) ;
        });
    }

    private terminalEnded(e: vscode.TerminalShellExecutionEndEvent) {
    }

    private readonly phraseToSearch = "start address of `.gnu.sgstubs' is different from previous link" ;
    private async terminalStarted(e: vscode.TerminalShellExecutionStartEvent) {
        let strm = e.execution.read() ;

        for await (const data of strm) {
            if (data.includes(this.phraseToSearch)) {
                this.foundVeneerProblem = true ;
            }
        }
    }

    private taskEnd(e: vscode.TaskEndEvent) {
        this.sendMessageWithArgs('buildDone', true) ;            
        this.memusage_.updateMemoryInfo()
        .then((ret) => {
            if (ret) {
                this.sendMessageWithArgs('memoryUsage', this.memusage_.usage) ;
            }
        }) ;

        if (this.foundVeneerProblem) {
            this.sendMessageWithArgs('showVeneerProblem', true) ;
        }
    }
    
    public get toolsDir(): string | undefined {
        return this.toolspath_;
    }

    public get lcsMgr(): LCSManager | undefined {
        return this.lcsMgr_;
    }

    public get deviceDB(): DeviceDBManager | undefined {
        return this.devicedb_;
    }

    public extStorageDir(p: string) {
        return path.join(this.context_.globalStorageUri.fsPath, p) ;
    }

    public createProjectDirect(targetdir: string, appname: string, bspid: string, ceid: string, prepvscode: boolean = true): Promise<[number, string[]]> {
        return this.worker_!.createProject(targetdir, appname, bspid, ceid, prepvscode) ;
    } ;

    private showSettingsError(name: string, message: string) {
        let err: SettingsError = { setting: name, message: message };
        this.sendMessageWithArgs('showSettingsError', [err]);
        this.sendMessageWithArgs('settings', this.settings_.settings);
    }

    /**
     * Sets the current intellisense project by sending an 'oob' request.
     * @param projectName The name of the project to set as the intellisense project.
     */
    public setIntellisenseProject(projectName?: string): void {
        if (!projectName) {
            this.intellisenseProject_ = this.context_.globalState.get('mtbintellisense', this.env_!.appInfo!.projects[0].name);
        }
        else {
            this.intellisenseProject_ = projectName;
        }

        this.context_.globalState.update('mtbintellisense', this.intellisenseProject_);
    }

    public sendIntellisenseProject() {
        this.setIntellisenseProject() ;
        this.sendMessageWithArgs('setIntellisenseProject', this.intellisenseProject_);
    }

    public bringChannelToFront() {
        this.channel_.show(true);
    }

    public get mgrsInitialized(): boolean {
        return this.postInitDone_;
    }

    public get mtbEnvLoaded(): boolean {
        return this.envLoaded_;
    }

    public clearPassword() { 
        this.password = undefined ;
    }

    public getPasswordFromUser(): Promise<string | undefined > {
        if (this.pendingPasswordPromise) {
            throw new Error('new password request while another is pending');
        }

        let ret = new Promise<string | undefined >((resolve, reject) => {
            if (this.password !== undefined) {
                resolve(this.password) ;
            }
            else {
                this.pendingPasswordPromise = resolve ;
                this.sendMessageWithArgs('getPassword', true);
            }
        });
    
        return ret ;
    }

    private sendMessageWithArgs(type: BackEndToFrontEndType, data: any) {
        let resp: BackEndToFrontEndResponse = {
            response: type,
            data: data
        };
        this.postWebViewMessage(resp);
    }

    private initNoTools(): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.optionallyShowPage(true) ;
            if (!this.setupMgr_.isLauncherAvailable) {
                this.mtbmode_ = 'none';
            }
            else {
                this.mtbmode_ = 'launcher';
            }
            this.sendMessageWithArgs('mtbMode', this.mtbmode_);
            this.sendMessageWithArgs('justNeedTools', this.setupMgr_.justNeedToolsPackage);
            resolve();
            return;
        });
        return ret;
    }

    private sentinelCount: number = 0;
    private postWebViewMessage(msg: any) {
        msg.sentinel = this.sentinelCount++;
        if (this.panel_) {
            this.panel_.webview.postMessage(msg);
        }
    }

    private getActiveBspInfo(): BSPIdentifier[] {
        let list = this.env_?.manifestDB?.activeBSPs || [];
        return list.map(board => {
            return {
                name: board.name,
                id: board.id,
                device: board.chips.get('mcu') || '',
                connectivity: board.chips.get('radio') || '',
                category: board.category,
                description: board.description || ''
            };
        });
    }

    private getAllBspInfo(): BSPIdentifier[] {
        let list = this.env_?.manifestDB?.allBsps || [];
        return list.map(board => {
            return {
                name: board.name,
                id: board.id,
                device: board.chips.get('mcu') || '',
                connectivity: board.chips.get('radio') || '',
                category: board.category,
                description: board.description || ''
            };
        });
    }

    private getAllBspExceptEAPInfo(): BSPIdentifier[] {
        let list = this.env_?.manifestDB?.allBSPsExceptEAP || [];
        return list.map(board => {
            return {
                name: board.name,
                id: board.id,
                device: board.chips.get('mcu') || '',
                connectivity: board.chips.get('radio') || '',
                category: board.category,
                description: board.description || ''
            };
        });
    }

    private sendBSPInformation() {
        this.sendMessageWithArgs('sendAllBSPs', this.getAllBspInfo());
        this.sendMessageWithArgs('sendActiveBSPs', this.getActiveBspInfo());
        this.sendMessageWithArgs('sendAllBSPsExceptEAP', this.getAllBspExceptEAPInfo());
    }

    private setupAuxiliaryStuffAlt() : Promise<void> {
        this.keywords_.init(this.env_!.appInfo!) ;

        let ret = new Promise<void>((resolve, reject) => {
            let parray: any[] = [];
            let p: Promise<void>;

            p = this.createModusShellTerminal();
            parray.push(p);

            if (this.env_ && this.env_.has(MTBLoadFlags.appInfo) && this.env_.appInfo) {
                p = this.intellisense_!.trySetupIntellisense();
                parray.push(p);
            }

            p = this.lcsMgr_!.updateBSPS();
            parray.push(p);

            Promise.all(parray)
                .then(() => {
                    this.logger_.debug('All auxiliary setup completed successfully.');
                    resolve();
                })
                .catch((error: Error) => {
                    this.logger_.error('Failed to complete auxiliary setup:', error.message);
                    reject(error) ;
                });                

        });
        return ret;
    }

    private setupAuxiliaryStuff() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            //
            // This is a bit of a hack, but we need to give VSCode a bit of time to settle down after telling the webview
            // to show the MTB view.  Showing the MTB view will cause the UI to ask for data.  We want those requests to
            // be services before this function runs.
            //
            setTimeout(() => {
                this.setupAuxiliaryStuffAlt().then(() => { 
                        resolve() ; 
                    })
                    .catch((error: Error) => { 
                        reject(error) ; }); 
                    }, 250) ;
        }) ;
        return ret ;
    }

    private initDeviceDB() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let asset = this.env_?.appInfo?.projects[0].findAssetInstanceByName('device-db') ;
            if (!asset) {
                this.logger_.error('Failed to find device-db asset instance.');
                reject(new Error('Failed to find device-db asset instance.'));
                return ;
            }

            if (!asset.rootdir) {
                this.logger_.error('Device-db asset instance does not have a root directory.');
                reject(new Error('Device-db asset instance does not have a root directory.'));
                return ;
            }

            this.devicedb_ = new DeviceDBManager(asset.rootdir!) ;
            this.devicedb_.initialize()
            .then(() => { 
                resolve() ;
            })
            .catch((error: Error) => {
                reject(error) ;
            }) ;
        });
        return ret;
    }

    private toolsSortFunc(a: string, b: string): number {
        let reg = /(tools_\d+\.\d+)/ ;
        let aloc = a.toLowerCase();
        let bloc = b.toLowerCase();

        let am = aloc.match(reg) ;
        let bm = bloc.match(reg) ;

        if (am && am.length > 1 && bm && bm.length > 1) {
            let av = MTBVersion.fromToolsVersionString(am[1]) ;
            let bv = MTBVersion.fromToolsVersionString(bm[1]) ;
            if (av && bv) {
                return MTBVersion.compare(bv, av) ;
            }
        }

        return 0 ;
    }

    public getAllToolsPaths() : string[] {
        let ret : string[] = ModusToolboxEnvironment.findToolsDirectories() ;

        // Search the various directories that we have used to install tools
        for(let dir of this.setupMgr_.mtbInstallDirs) {
            let dirlist = ModusToolboxEnvironment.findToolsDirectories(dir) ;
            ret = ret.concat(dirlist) ;
        }

        let dirlist = this.setupMgr_.toolsFromIDCRegistry() ;
        ret = ret.concat(dirlist) ;

        
        // Remove duplicates
        ret = Array.from(new Set(ret)) ;
        ret = ret.sort(this.toolsSortFunc.bind(this));

        for(let i = 0 ; i < ret.length ; i++) {
            let p = ret[i].replace(/\\/g, '/') ;
            ret[i] = p ;
        }
        return ret ;
    }

    private findToolsPath() : string | undefined {
        let tools = this.getAllToolsPaths() ;
        return tools[0] ;
    }

    private findWorkspaceFile(dir: string) : string | undefined {
        let files = fs.readdirSync(dir) ;
        for(let f of files) {
            if (f.endsWith('.code-workspace')) {
                return path.join(dir, f) ;
            }
        }
        return undefined ;
    }

    private needsGetLibs() : boolean {
        let getlibs = false ;
        for(let proj of this.env_!.appInfo!.projects) {
            let appmk = path.join(proj.path, 'libs', 'app.mk')  ;
            if (!fs.existsSync(appmk)) {
                getlibs = true ;
                break ;
            }
        }
        return getlibs ;
    }

    private seeIfGetLibsNeeded() : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            if (this.needsGetLibs()) {
                for(let proj of this.env_!.appInfo!.projects) {
                    try {
                        this.sendMessageWithArgs('addStatusLine', `Running 'make getlibs' for project ${proj.name}...`) ;
                        await this.worker_?.runMakeGetLibs(proj) ;
                    }
                    catch(error: any) {
                        this.logger_.error(`Failed to run 'make getlibs' for project ${proj.name}: ${error.message}`);
                        this.sendMessageWithArgs('addStatusLine', `Failed to run 'make getlibs' for project ${proj.name}: ${error.message}`) ;
                        reject(error) ;
                        return ;
                    }
                }
                resolve() ;
            }
            else {
                resolve() ;
            }
        }) ;
        return ret ;
    } ;

    private reOpenWorkspace(wkspc: string | undefined) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (wkspc) {
                // The workspace was already loaded, so loading it again would not do anything
                vscode.commands.executeCommand('workbench.action.reloadWindow') ;
            }
            else {
                wkspc = this.findWorkspaceFile(this.env_!.appInfo!.appdir) ;                
                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(wkspc!)) ;
            }            
            resolve() ;
        });
        return ret;
    }

    private runVSCodeAndReload() {
        this.sendMessageWithArgs('startOperation', `Preparing Application For VSCode`) ;        
        let wkspc = this.findWorkspaceFile(this.env_!.appInfo!.appdir) ;

        this.seeIfGetLibsNeeded()
        .then(() => {
            this.sendMessageWithArgs('addStatusLine', `Running 'make vscode'...`) ;
            this.runMakeVSCode()
            .then(() => {
                let wkspc = this.findWorkspaceFile(this.env_!.appInfo!.appdir) ;
                if (wkspc) {
                    this.pendingStatusClosePromise = this.reOpenWorkspace.bind(this, wkspc) ;
                    this.sendMessageWithArgs('finishOperation', '') ;                    
                }
                else {
                    this.logger_.error(`Failed to find workspace file after running 'make vscode'`);
                    vscode.window.showErrorMessage(`Failed to find workspace file after running 'make vscode'`);
                    this.sendMessageWithArgs('addStatusLine', `Failed to find workspace file after running 'make vscode'`) ;
                    this.sendMessageWithArgs('finishOperation', '') ;
                    throw new Error(`Failed to find workspace file after running 'make vscode'`);
                }                    
            }) ;
        })
        .catch((error: Error) => {
            this.logger_.error(`Failed to run 'make getlibs': ${error.message}`);
            this.sendMessageWithArgs('finishOperation', '') ;
        });
    }

    private checkVSCodeStructure() : void {
        if (vscode.workspace.workspaceFile && this.env_!.appInfo) {
            let vscodedir = path.join(this.env_!.appInfo!.appdir, '.vscode') ;  
            if (!fs.existsSync(vscodedir)) {
                this.optionallyShowPage(true) ;
                this.runVSCodeAndReload() ;
            }
            else {
                this.logger_.debug(`workspace file and .vscode directory exists, no need to run 'make vscode'`) ;
            }
        }
        else {
            //
            // There is no workspace file loaded, check if one exists
            //
            if (this.env_ && this.env_.appInfo && this.env_.appInfo.appdir) {
                let wkspc = this.findWorkspaceFile(this.env_!.appInfo!.appdir) ;
                if (wkspc) {
                    //
                    // Load the workspace file, this should re-initialize the extension and not return in a meaningful way
                    //
                    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(wkspc)) ;
                }
                else {
                    //
                    // There is not workspace file, run make vscode
                    //
                    this.runVSCodeAndReload() ;
                }
            }
        }
    }

    private sendLCSKeywordAliases() : void {
        let aliases : LCSBSPKeywordAliases[] = [] ;
        let categories = new Set(this.env_!.manifestDB.allBsps.map(b => b.category)) ;
        for(let cat of categories) {
            let catmod = '' ;
            for(let c of cat) {
                if (c.charCodeAt(0) < 256) {
                    catmod += c.toLowerCase() ;
                }
            }
            let bsps = this.env_!.manifestDB.allBsps.filter(b => b.category === cat).map(b => b.name) ;
            let entry : LCSBSPKeywordAliases = {
                keyword: catmod.toLowerCase(),
                bsps: bsps
            };
            aliases.push(entry);
        }
        this.sendMessageWithArgs('lcsKeywordAliases', aliases);
    }

    private sendLCSGuide() : void {
        let lcspath = this.lcsMgr_?.findLcsCLIPath() || undefined ;
        if (lcspath) {
            let lcsGuide : string | undefined ;
            let pinfo = this.projectInfo_.get('');
            for(let doc of pinfo?.documentation || []) {
                let p = path.normalize(doc.location) ;
                if (p.startsWith(lcspath)) {
                    lcsGuide = doc.location ;
                    break ;                    
                }
            }
            this.sendMessageWithArgs('lcsGuide', lcsGuide) ;
        }
    }

    private sendTasks() : void {
        let tasks : MTBAssistantTask[] = [] ;
        if (this.env_ && this.env_.has(MTBLoadFlags.appInfo) && this.env_.appInfo && this.isPSOCEdge()) {
            let proj = this.env_.appInfo.projects.find(p => p.name === 'proj_bootloader') ;
            if (!proj) {
                tasks.push(
                    {
                        description: 'Add Bootloader',
                        vscodecmd: 'mtbassist2.addBootloader',
                        args: []
                    }) ;
            }
        }
        this.sendMessageWithArgs('tasksAvailable', tasks) ;
    }

    private createVSCodeTaskManager() : void {
        if (!this.env_ || !this.env_.appInfo) {
            throw new Error('No application loaded, cannot create VSCode task manager');
        }

        let p = path.join(this.env_!.appInfo!.appdir, '.vscode', 'tasks.json');
        let gen = new VSCodeAppTaskGenerator(this.env_!, this.settings_) ;
        this.tasks_.set('', new VSCodeTasks(this.logger_, p, gen)) ;

        if (this.env_!.appInfo!.type() !== ApplicationType.combined)
        {
            for(let proj of this.env_!.appInfo!.projects) {
                p = path.join(this.env_!.appInfo!.appdir, proj.name, '.vscode', 'tasks.json');
                let pgen = new VSCodeProjTaskGenerator(this.env_!, this.settings_, proj) ;
                this.tasks_.set(proj.name, new VSCodeTasks(this.logger_, p, pgen)) ;
            }
        }
    }

    private initWithTools(): Promise<void> {
        let runtime = RunTimeTracker.getInstance() ;
        runtime.mark('initWithTools');

        let ret = new Promise<void>((resolve, reject) => {
            this.env_ = ModusToolboxEnvironment.initInstance(this.logger_, this.settings_);
            if (!this.env_) {
                this.logger_.error('Failed to initialize ModusToolbox environment.');
                return;
            }

            runtime.mark('ModusToolboxEnvironment.getInstance')  ;


            this.toolspath_ = this.settings_.toolsPath;
            if (!this.toolspath_ || this.toolspath_.length === 0 || !fs.existsSync(this.toolspath_)) {
                //
                // The workspace does not have a tools path setting, find a valid one
                //
                this.toolspath_ = this.findToolsPath() ;
                this.settings_.toolsPath = this.toolspath_ ;

                // Update the GUI
                this.sendMessageWithArgs('settings', this.settings_.settings);
            }

            this.lcsMgr_ = new LCSManager(this);
            this.lcsMgr_.on('show', this.bringChannelToFront.bind(this));
            this.lcsMgr_.on('log', (line) => {
                this.logger_.info(`lcs-manager: ${line}`);
            });
            this.lcsMgr_.on('lcsdone', () => {
                this.sendMessageWithArgs('settings', this.settings_.settings);
                this.logger_.debug(`lcs-manager: LCS operation completed`);
            });
            runtime.mark('LCSManager init') ;

            this.worker_ = new VSCodeWorker(this.logger_, this);
            this.worker_.on('progress', this.sendMessageWithArgs.bind(this, 'createProjectProgress'));
            this.worker_.on('runtask', this.runTask.bind(this));
            this.worker_.on('loadedAsset', this.sendMessageWithArgs.bind(this, 'loadedAsset'));
            this.worker_.on('gitState', this.gitStateTrampoline.bind(this)) ;
            runtime.mark('VSCodeWorker init') ;

            this.readComponentDefinitions();

            this.loadMTBApplication().then(() => {
                runtime.mark('loadMTBApplication') ;
                this.checkVSCodeStructure() ;
                runtime.mark('checkVSCodeStructure') ;
                runtime.mark('updateStatusBar') ;
                this.createAppStructure();
                runtime.mark('createAppStructure') ;
                this.sendTasks() ;
                runtime.mark('sendTasks') ;

                this.logger_.debug('All managers initialized successfully.');

                // The settings depend on the loaded application, specifically the tools version, from settings
                if (this.settings_.checkToolsVersion()) {
                    this.sendMessageWithArgs('settings', this.settings_.settings);
                }

                if (this.env_ && this.env_.appInfo) {
                    this.sendMessageWithArgs('sendDefaultProjectDir', path.dirname(this.env_!.appInfo!.appdir));
                }
                else {
                    let path = this.context_.globalState.get(MTBAssistObject.lastProjectPath, os.homedir()) ;
                    this.sendMessageWithArgs('sendDefaultProjectDir', path);
                }

                this.mtbmode_ = 'mtb' ;
                this.sendMessageWithArgs('mtbMode', this.mtbmode_);

                this.postInitializeManagers()
                .then(() => {
                    runtime.mark('postInitializeManagers') ;
                    if (this.env_ && this.env_.has(MTBLoadFlags.appInfo) && this.env_.appInfo) {
                        // We do this again in case the setting is to show the mtb assistant only if an application is loaded
                        this.optionallyShowPage();
                        this.recents_!.addToRecentProject(this.env_!.appInfo!.appdir, this.env_!.bspName || '');

                        this.sendMessageWithArgs('selectTab', MTBAssistObject.applicationStatusTab) ;

                        this.createVSCodeTaskManager() ;

                        this.vscodeSettings_ = new MTBVSCodeSettings(this);

                        this.getLaunchData()
                            .then(() => {
                                runtime.mark('getLaunchData') ;
                                this.setIntellisenseProject();
                                this.initDeviceDB() 
                                .then(() => {
                                    runtime.mark('initDeviceDB') ;
                                    this.memusage_.updateMemoryInfo()
                                    .then(() => {
                                        runtime.mark('updateMemoryInfo') ;
                                        this.logger_.debug('All managers post-initialization completed successfully.');

                                        //
                                        // Tell the front end we are ready to supply (most) data.  Since manifest data takes a while to 
                                        // get from the git hub servers, we handle this data independently
                                        //
                                        this.ready_ = true ;
                                        this.computeTheme() ;
                                        this.sendMessageWithArgs('ready', this.theme_) ;
                                        this.mtbmode_ = 'mtb' ;
                                        this.sendMessageWithArgs('mtbMode', this.mtbmode_);
                                        runtime.mark('Show Application') ;

                                        this.setupAuxiliaryStuff()
                                        .then(() => {
                                            runtime.mark('setupAuxiliaryStuff') ;
                                            this.env?.load(MTBLoadFlags.manifestData)
                                            .then(() => {
                                                runtime.mark('loadManifestData') ;
                                                this.sendManifestStatus() ;
                                                runtime.mark('application load done') ;
                                                runtime.printAll(this.logger_) ;
                                                this.sendBSPInformation() ;
                                                resolve() ;
                                            })
                                            .catch((err) => {
                                                this.sendManifestStatus();
                                                reject(err);
                                            });
                                        })
                                        .catch((error: Error) => {
                                            this.logger_.error('Failed to load manifest files:', error.message);
                                            resolve();
                                        }) ;
                                    })
                                    .catch((error: Error) => {
                                        this.logger_.error('Failed to load manifest files:', error.message);
                                        resolve();
                                    });
                                })
                                .catch((error: Error) => {
                                    this.logger_.error('Failed to initialize device database:', error.message);
                                    resolve();
                                });
                            })
                            .catch((error: Error) => {
                                this.logger_.error('Error during post-initialization of managers:', error.message);
                                resolve() ;
                            });
                    }
                    else {
                        runtime.mark('update status bar') ;
                        this.ready_ = true ;
                        this.sendMessageWithArgs('ready', this.theme_) ;
                        this.sendTheme() ;
                        this.mtbmode_ = 'mtb' ;
                        this.sendMessageWithArgs('mtbMode', this.mtbmode_);
                        runtime.mark('Show Application') ;
                        this.setupAuxiliaryStuff()
                        .then(() => {
                            runtime.mark('setupAuxiliaryStuff') ;
                            this.env?.load(MTBLoadFlags.manifestData)
                            .then(() => {
                                runtime.mark('loadManifestData') ;
                                this.sendManifestStatus() ;
                                this.logger_.debug('ModusToolbox manifests loaded successfully.');
                                runtime.printAll(this.logger_) ;
                                resolve();
                            })
                            .catch((error: Error) => {
                                this.sendManifestStatus() ;                                
                                this.logger_.error('Failed to load ModusToolbox manifests:', error.message);
                                reject(error) ;
                            });
                        })
                        .catch((error: Error) => {
                            this.logger_.error('Failed to load manifest files:', error.message);
                            resolve();
                        });
                    }
                })
                .catch((err) => {
                    this.sendMessageWithArgs('error', `Error Initializing ModusToolbox Assistant - ${(err as Error).message}`) ;
                    reject(err) ;
                }) ;

            })
            .catch((err) => {
                this.logger_.error('Error loading ModusToolbox application:', (err as Error).message);
                this.sendMessageWithArgs('error', `<div>Error Initializing ModusToolbox Assistant<br>${(err as Error).message}</div>`) ;
                reject(err);
            });
        });
        return ret;
    }

    private gitStateTrampoline(state: ProjectGitStateTrackerData) {
        this.sendMessageWithArgs('gitState', state);
    }

    private readComponentDefinitions(): void {
        let p = path.join(__dirname, '..', 'content', 'components.json');
        if (fs.existsSync(p)) {
            let data = fs.readFileSync(p, 'utf8');
            try {
                let components = JSON.parse(data);
                for (let comp of components) {
                    this.compDescMap_.set(comp.name, comp.description);
                }
            }
            catch (err) {
                this.logger_.error('Failed to parse components JSON:', (err as Error).message);
            }
        }
    }

    private readGlossaryEntries(): GlossaryEntry[] {
        let ret: GlossaryEntry[] = [];
        let p = path.join(__dirname, '..', 'content', 'glossary.json');
        if (fs.existsSync(p)) {
            let data = fs.readFileSync(p, 'utf8');
            try {
                ret = JSON.parse(data);
            }
            catch (err) {
                this.logger_.error('Failed to parse glossary JSON:', (err as Error).message);
            }
        }

        return ret;
    }

    private sendGlossary(): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let entries = this.readGlossaryEntries();
            this.sendMessageWithArgs('glossaryEntries', entries);
            resolve();
        });
        return ret;
    }

    private waitForLauncherTimer() {
        if (this.setupMgr_ && this.setupMgr_.isLauncherAvailable) {
            clearInterval(this.launchTimer);
            this.launchTimer = undefined;
            this.doRestartExtension();
        }
    }

    private optionallyShowPage(force: boolean = false): void {
        let config = vscode.workspace.getConfiguration();
        let autodisp = config.get('mtbassist2.autodisplay') as string;
        if (autodisp === 'Always' || force) {
            this.mtbMainPage([]) ;
        }
        else if (autodisp !== 'Never') {
            if (this.env_ && this.env_.appInfo) {
                this.mtbMainPage([]) ;
            }
        }
    }

    public getToolchainAndPath() : null | [string, string] {
        let v = this.settings_.settingByName('toolchain');
        if (v && v.type === 'string') {
            let setting : MTBSetting | undefined ;
            let ret : [string, string] = [v.value as string, ''] ;
            switch(v.value as string) {
                case 'ARM':
                    setting = this.settings_.settingByName('armccpath') ;
                    if (!setting || setting.type !== 'string' || !setting.value || (setting.value as string).length === 0) {
                        return null ;
                    }
                    ret[1] = setting.value as string ;
                    break ;
                case 'IAR':
                    setting = this.settings_.settingByName('iarpath') ;
                    if (!setting || setting.type !== 'string' || !setting.value || (setting.value as string).length === 0) {
                        return null ;
                    }
                    ret[1] = setting.value as string ;
                    break ;
                case 'LLVM_ARM':
                    setting = this.settings_.settingByName('llvmpath') ;
                    if (!setting || setting.type !== 'string' || !setting.value || (setting.value as string).length === 0) {
                        return null ;
                    }
                    ret[1] = setting.value as string ;
                    break ;
                case 'GCC_ARM':
                case 'Per Project':
                    setting = this.settings_.settingByName('gccpath') ;
                    if (!setting || setting.type !== 'string' || !setting.value || (setting.value as string).length === 0) {
                        return null ;
                    }
                    ret[1] = setting.value as string ;
                    break ;
                default:
                    return null ;
            }   

            return ret ;
        }

        let gcctool = this.env!.toolsDB.findToolByGUID(MTBAssistObject.gccUUID);
        if (!gcctool) {
            return null ;
        }

        let p = path.join(gcctool.path, "bin", "arm-none-eabi-gcc");        
        return ['GCC_ARM', p] ;
    }

    public async initialize(): Promise<void> {
        let runtime = RunTimeTracker.getInstance() ;

        runtime.mark('startInitialize');
        this.initializeCommands() ;
        runtime.mark('initializeCommands');
        this.optionallyShowPage() ;                     // Shows initialization page
        runtime.mark('optionallyShowPage');

        let ret = new Promise<void>((resolve, reject) => {
            this.setupMgr_?.initializeLocal()
                .then(() => {
                    runtime.mark('setupMgrInitializeLocal');
                    if (this.setupMgr_!.doWeNeedTools()) {
                        this.initNoTools()
                            .then(() => {
                                if (!this.setupMgr_!.isLauncherAvailable && !this.launchTimer) {
                                    this.launchTimer = setInterval(this.waitForLauncherTimer.bind(this), 1000);
                                }
                                resolve();
                            })
                            .catch((err) => {
                                reject(err);
                            });
                    }
                    else {
                        this.initWithTools()
                            .then(() => {
                                resolve();
                            })
                            .catch((err) => {
                                reject(err);
                            });
                    }
                })
                .catch((err) => {
                    reject(err);
                });

        });

        return ret;
    }

    public get context(): vscode.ExtensionContext {
        return this.context_;
    }

    public get env(): ModusToolboxEnvironment | null {
        if (!this.env_) {
            return null;
        }

        return this.env_;
    }

    public get logger(): winston.Logger {
        return this.logger_;
    }

    public static initInstance(context: vscode.ExtensionContext): MTBAssistObject {
        if (MTBAssistObject.theInstance_) {
            throw new Error('MTBAssistObject is already initialized - cannot be initialized more than once.');
        }

        MTBAssistObject.theInstance_ = new MTBAssistObject(context);
        MTBAssistObject.theInstance_.initialize()
            .then(() => {
            })
            .catch((error: Error) => {
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

    private needMemoryExportFile(): boolean {
        let ret = false ;

        if (this.env_ && this.env_.appInfo && this.env_.bspName) {
            let memfile = path.join(this.env_!.appInfo!.appdir, 'bsps', this.env_!.bspName!, 'config', 'GeneratedSource', 'design.cyqspi.memory-export') ;
            if (!fs.existsSync(memfile)) {
                ret = true ;
            }
        }

        return ret;
    }

    private async runTask(data:TaskToRun) {
        let taskSetName = data.project ? data.project : '' ;
        let t = this.tasks_.get(taskSetName) ;

        let taskname = data.task + (data.project ? ':' + data.project : '') ;
        if (t && t.doesTaskExist(taskname)) {
            // A hack for ModusToolbox.  If we are running a task and the memory export file
            // does not exist, we delete the timestamp file so that the PSOC Creator
            // code generation will run and create the memory export file.
            if (this.isPSOCEdge() && this.needMemoryExportFile()) {
                let tstfile = path.join(this.env_!.appInfo!.appdir, 'bsps', this.env_!.bspName!, 'config', 'GeneratedSource', 'cycfg.timestamp') ;
                if (fs.existsSync(tstfile)) {
                    fs.rmSync(tstfile, { force: true }) ;
                }
            }
            vscode.tasks.fetchTasks().then((alltasks) => {
                let t: vscode.Task | undefined = undefined ;
                for(let task of alltasks) {
                    if (task.name === taskname) {
                        t = task ;
                        break ;
                    }
                }

                if (t) {
                    this.foundVeneerProblem = false ;
                    vscode.tasks.executeTask(t)
                    .then((e) => {
                        // TODO: keep this for possible future use so we can add a 'Stop' button
                        // e.terminate()
                    }) ;
                } ;
            }) ;
        }
        else {
            this.logger_.warn(`Task not found: task=${data.task} project=${data.project}`) ;
            let projmsg = data.project ? ` for project '${data.project}'` : '' ;
            vscode.window.showWarningMessage(`The requested task '${data.task}' does not exist ${projmsg}.  At the main application pages, use the 'Fix Tasks' button to create missing tasks.`) ;
            this.sendMessageWithArgs('buildDone', true) ;
        }
    }

    private bindCommandHandlers(): void {
        this.cmdhandler_.set('gettingStarted', this.gettingStarted.bind(this));
        this.cmdhandler_.set('documentation', this.documentation.bind(this));
        this.cmdhandler_.set('browseExamples', this.browseExamples.bind(this));
        this.cmdhandler_.set('community', this.community.bind(this));
        this.cmdhandler_.set('browseForFolder', this.browseForFolder.bind(this));
        this.cmdhandler_.set('browseForFile', this.browseForFile.bind(this));
        this.cmdhandler_.set('app-data', this.sendAppStatus.bind(this));
        this.cmdhandler_.set('open', this.open.bind(this));
        this.cmdhandler_.set('libmgr', this.launchLibraryManager.bind(this));
        this.cmdhandler_.set('devcfg', this.launchDeviceConfigurator.bind(this));
        this.cmdhandler_.set('tool', this.tool.bind(this));
        this.cmdhandler_.set('kit-data', this.refreshDevKits.bind(this));
        this.cmdhandler_.set('updateFirmware', this.updateFirmware.bind(this));
        this.cmdhandler_.set('recent-data', this.recentlyOpened.bind(this));
        this.cmdhandler_.set('openRecent', this.openRecent.bind(this));
        this.cmdhandler_.set('openReadme', this.openReadme.bind(this));
        this.cmdhandler_.set('initSetup', this.initSetup.bind(this));
        this.cmdhandler_.set('logMessage', this.logMessage.bind(this));
        this.cmdhandler_.set('getCodeExamples', this.getCodeExamples.bind(this));
        this.cmdhandler_.set('createProject', this.createProject.bind(this));
        this.cmdhandler_.set('loadWorkspace', this.loadWorkspace.bind(this));
        this.cmdhandler_.set('fixMissingAssets', this.fixMissingAssets.bind(this));
        this.cmdhandler_.set('buildAction', this.runAction.bind(this));
        this.cmdhandler_.set('installTools', this.installTools.bind(this));
        this.cmdhandler_.set('restartExtension', this.restartExtension.bind(this));
        this.cmdhandler_.set('runSetupProgram', this.runSetupProgram.bind(this));
        this.cmdhandler_.set('setIntellisenseProject', this.setIntellisenseProjectFromGUI.bind(this));
        this.cmdhandler_.set('updateDevKitBsp', this.updateDevKitBsp.bind(this));
        this.cmdhandler_.set('updateSetting', this.updateSetting.bind(this));
        this.cmdhandler_.set('lcscmd', this.lcscmd.bind(this));
        this.cmdhandler_.set('settings-data', this.getSettings.bind(this));
        this.cmdhandler_.set('checkInstallPath', this.checkInstallPath.bind(this));
        this.cmdhandler_.set('hasAccount', this.hasAccount.bind(this));
        this.cmdhandler_.set('cproj-data', this.getCProjData.bind(this));
        this.cmdhandler_.set('check-ready', this.checkReady.bind(this));
        this.cmdhandler_.set('lcs-data', this.getLcsData.bind(this));
        this.cmdhandler_.set('glossary-data', this.getGlossaryData.bind(this)) ;
        this.cmdhandler_.set('user-guide-data', this.provideUserGuide.bind(this)) ;
        this.cmdhandler_.set('fix-tasks', this.fixTasks.bind(this)) ;
        this.cmdhandler_.set('prepareVSCode', this.prepareVSCode.bind(this)) ;
        this.cmdhandler_.set('password', this.processPasswordResponse.bind(this)) ;
        this.cmdhandler_.set('memory-data', this.sendMemoryInfo.bind(this)) ;   
        this.cmdhandler_.set('refreshApp', this.refreshApp.bind(this)) ;
        this.cmdhandler_.set('fix-settings', this.fixSettings.bind(this)) ;
        this.cmdhandler_.set('install-llvm', this.installLLVM.bind(this)) ;
        this.cmdhandler_.set('set-config', this.setConfig.bind(this)) ;
        this.cmdhandler_.set('operation-status-closed', this.handleOperationStatusClosed.bind(this)) ;
        this.cmdhandler_.set('run-task', this.runTaskFromGUI.bind(this)) ;
        this.cmdhandler_.set('install-idc-service', this.installIDCService.bind(this)) ;
        this.cmdhandler_.set('delete-veneer-file', this.deleteVeneerFile.bind(this)) ;
    }

    private deleteVeneerFile(request: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            for(let proj of this.env_!.appInfo!.projects) {
                let veneerFile = path.join(proj.path, 'nsc_veneer.o') ;
                if (fs.existsSync(veneerFile)) {
                    fs.rmSync(veneerFile, { force: true }) ;
                    this.logger_.info(`Deleted veneer file: ${veneerFile}`) ;
                }
            } ;
        }) ;
    }

    private installIDCService() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.sendMessageWithArgs('startOperation', 'Installing IDC Service') ;
            this.setupMgr_.installIDCService()
            .then(() => {
                this.sendMessageWithArgs('addStatusLine', 'IDC Service installed successfully') ;
                this.sendMessageWithArgs('finishOperation', '') ;
                resolve() ;
            })
            .catch((err) => {
                this.sendMessageWithArgs('addStatusLine', `Failed to install IDC Service: ${err.message}`) ;
                this.sendMessageWithArgs('finishOperation', '') ;
                reject(err) ;
            }) ;
        }) ;
        return ret ;
    }

    private runTaskFromGUI(request: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (request.data) {
                let d: MTBAssistantTask = request.data ;
                if (d.description && d.vscodecmd) {
                    vscode.commands.executeCommand(d.vscodecmd, ...d.args) ;
                }
            }
            resolve() ;
        }) ;            this.sendMessageWithArgs('settings', this.settings_.settings);
    }

    private handleOperationStatusClosed() : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.pendingStatusClosePromise) {
                let p = this.pendingStatusClosePromise ;
                this.pendingStatusClosePromise = undefined ;
                p() ;
            }
            resolve() ;
        }) ;
    }

    private setConfig(request: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (request.data) {
                this.settings_.configuration = request.data ;
            }
            resolve() ;
        });
    }

    private installLLVM(request: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!request.data) {
                // Just bring up the install page
                LLVMInstaller.getAvailableVersions(this.logger_)
                .then((versions) => {
                    this.sendMessageWithArgs('installLLVM', {
                        enabled: true,
                        versions: versions,
                        copyright: this.llvminstaller_.copyright,
                    }) ;
                    resolve() ;
                }) ;
            }
            else {
                // Actually do the install
                this.llvminstaller_.install(request.data.version, request.data.installPath)
                .then(() => {
                    this.settings_.llvmPath = this.llvminstaller_.installPath ;
                    this.sendMessageWithArgs('installLLVM', {
                        enabled: false,
                        versions: []
                    }) ;
                    this.sendMessageWithArgs('appStatus', this.getAppStatusFromEnv()) ;
                    this.sendMessageWithArgs('settings', this.settings_.settings);
                    vscode.window.showInformationMessage(`LLVM ${request.data.version} installed successfully.`);
                    resolve() ;
                }) ;
            }
        }) ;
    }

    private refreshApp(request: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.env_ && this.env_.appInfo) {
                this.doRestartExtension()
                .then(() => {
                    resolve() ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
            }
        });
    }   

    private sendMemoryInfo(request: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.memusage_.updateMemoryInfo() ;
            this.sendMessageWithArgs('memoryUsage', this.memusage_.usage) ;
            resolve() ;
        });
    }

    private processPasswordResponse(data: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.pendingPasswordPromise) {
                this.password = data.data ;
                let p = this.pendingPasswordPromise ;
                this.pendingPasswordPromise = undefined ;
                this.sendMessageWithArgs('getPassword', false);
                p(data.data ? data.data : undefined) ;
            }
        });
    }

    public runMakeVSCode() : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.env_ && this.env_.appInfo) {
                this.worker_?.runMakeVSCodeCommand(this.env_.appInfo.appdir)
                .then((result) => {
                    if (result[0] !== 0) {
                        reject(new Error('Failed to run make vscode command')) ;
                        return ;
                    }
                    this.tasks_?.forEach((t) => { t.addRequiredTasks(); }) ;
                    this.vscodeSettings_?.fix() ;                      
                    resolve() ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
            }
        });
    }

    private prepareVSCode(request: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.env_ && this.env_.appInfo) {
                this.worker_?.runMakeVSCodeCommand(this.env_.appInfo.appdir)
                .then((result) => {
                    this.tasks_?.forEach((t) => { t.addRequiredTasks(); }) ;
                    this.vscodeSettings_?.fix() ;                    
                    this.sendMessageWithArgs('appStatus', this.getAppStatusFromEnv()) ;                    
                    resolve() ;
                })
                .catch((err) => {
                    this.sendMessageWithArgs('appStatus', this.getAppStatusFromEnv()) ;  
                    reject(err) ;
                }) ;
            }
        }) ;
    }

    private fixSettings(request: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.env_ && this.env_.appInfo) {
                this.vscodeSettings_?.fix() ;
                this.sendMessageWithArgs('appStatus', this.getAppStatusFromEnv()) ;                
            }
        }) ;
    }

    private fixTasks(request: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.tasks_?.forEach((t) => { t.addRequiredTasks(); }) ;
            this.sendMessageWithArgs('appStatus', this.getAppStatusFromEnv()) ;
            resolve();
        });
    }

    private getUserGuideContent(): string {
        let ret: string = '';
        this.computeTheme() ;
        let filename = 'usersguide-' + this.theme_ + '.html' ;
        let p = path.join(__dirname, '..', 'content', filename);
        if (fs.existsSync(p)) {
            ret = fs.readFileSync(p, 'utf8');
        }
        else {
            ret = 'File Not Found' ;
        }

        return ret;
    }
    private provideUserGuide(_: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {

            this.sendMessageWithArgs('userguide', this.getUserGuideContent()) ;
            resolve() ;
        });
    }

    private getGlossaryData(_ : FrontEndToBackEndRequest) : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.sendGlossary()
            .then(() => {
                resolve();
            })
            .catch(reject);
        });
    }

    private getLcsData(request: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.manifestStatus_ === 'loaded') {
                this.sendLCSData() ;
                this.sendLCSGuide() ;
                this.sendLCSKeywordAliases() ;
            }
            resolve() ;
        });
    }

    private sendAppStatus(request: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.sendMessageWithArgs('appStatus', this.getAppStatusFromEnv()) ;
        });
    }

    private checkReady(request: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let osplat: string = process.platform ;
            this.sendMessageWithArgs('os', osplat) ;

            if (this.ready_) {
                let osplat: string = process.platform ;
                this.sendMessageWithArgs('os', osplat) ;
                this.sendMessageWithArgs('mtbMode', this.mtbmode_) ;
                this.sendMessageWithArgs('ready', this.theme_) ;
                if (this.env_ && this.env_.has(MTBLoadFlags.manifestData)) {
                    this.sendManifestStatus() ;
                }
                else {
                    this.env_?.load(MTBLoadFlags.manifestData)
                    .then(() => {
                        this.sendManifestStatus() ;
                    })
                    .catch(() => { 
                        this.sendManifestStatus() ;
                    }) ;
                }
            }
            resolve() ;
        });
    }   

    private getCProjData(request: FrontEndToBackEndRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.sendBSPInformation() ;
        });
    }

    static readonly validPathChars: RegExp = /^[a-zA-Z0-9_\-\/\\\.]+$/;
    static readonly validPathCharsWindows: RegExp = /^[A-Z]:[a-zA-Z0-9_\-\/\\\.]+$/;
    private checkValidPath(p: string): boolean {
        if (MTBAssistObject.validPathChars.test(p)) {
            return true;
        }

        if (process.platform === 'win32' && MTBAssistObject.validPathCharsWindows.test(p)) {
            return true;
        }

        return false;
    }

    private checkWritable(p: string): boolean {
        try {
            // Check if directory exists
            if (!fs.existsSync(p)) {
                return false;
            }

            // Check if it's actually a directory
            const stat = fs.statSync(p);
            if (!stat.isDirectory()) {
                return false;
            }

            // Test write permission by creating a temporary file
            const testFile = path.join(p, '.write_test_' + Date.now());
            try {
                fs.writeFileSync(testFile, 'test');
                fs.unlinkSync(testFile);
                return true;
            } catch (writeError) {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    private hasAccount(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let homedir = os.homedir();
            if (!this.checkValidPath(homedir)) {
                let st: MTBLocationStatus = {
                    homeError: 'Your home directory is not a valid ModusToolbox install location. It contains invalid characters.  Please choose a custom path that is valid.'
                };
                this.sendMessageWithArgs('setChooseMTBLocationStatus', st);
                resolve();
                return;
            }
        });
        return ret;
    }

    private checkInstallPath(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let send = false;
            let homedir = os.homedir();
            let st: MTBLocationStatus = {};

            if (!this.checkValidPath(homedir)) {
                st['homeError'] = 'Your home directory is not a valid ModusToolbox install location. It contains invalid characters.  Please choose a custom path that is valid.';
            }

            if (!this.checkValidPath(request.data)) {
                st['customError'] = 'The chosen path is not a valid ModusToolbox install location. It contains invalid characters.  Please choose a different path.';
                send = true;
            }
            else if (!this.checkWritable(request.data)) {
                st['customWarning'] = 'The chosen path is not writable by the current user.  Administration priviledges will be required for this installation.';
                send = true;
            }

            if (send) {
                this.sendMessageWithArgs('setChooseMTBLocationStatus', st);
            }
        });
        return ret;
    }

    private chooseMTBLocation(type: string, cpath: string): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let mtbLocation: string;
            let mtbTools: string;

            if (type === 'home') {
                if (process.platform === 'win32') {
                    mtbLocation = path.join(os.homedir(), 'ModusToolbox');
                    mtbTools = '';
                }
                else if (process.platform === 'darwin') {
                    mtbLocation = path.join(os.homedir(), 'Applications', 'ModusToolbox');
                    mtbTools = '';
                }
                else if (process.platform === 'linux') {
                    mtbLocation = path.join(os.homedir(), 'ModusToolbox');
                    mtbTools = '';
                }
                else {
                    throw new Error('Unsupported platform for home directory installation');
                }
            }
            else {
                if (cpath === undefined) {
                    return;
                }
                mtbLocation = path.join(cpath, 'ModusToolbox');
                mtbTools = cpath;
            }

            this.setupMgr_.mtbLocation = mtbLocation;
            this.setupMgr_.mtbTools = mtbTools;

            resolve();
        });
        return ret;
    }

    private getSettings(_: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.sendMessageWithArgs('settings', this.settings_.settings);
            resolve();
        });
        return ret;
    }

    private lcscmd(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.lcsMgr_!.command(request.data)
                .then(() => {
                    this.sendLCSData();
                    this.pushNeedsApply();
                    this.pushNeedsUpdate();
                    resolve();
                })
                .catch((error: Error) => {
                    this.logger_.error('Failed to execute LCS command:', error.message);
                    reject(error);
                });
        });
        return ret;
    }

    private updateSetting(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.settings_.update(request.data);
            resolve();
        });
        return ret;
    }

    private updateDevKitBsp(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (this.devkitMgr_) {
                this.devkitMgr_.updateDevKitBsp(request.data.kit, request.data.bsp)
                    .then(() => {
                        this.sendDevKitStatus();
                        resolve();
                    })
                    .catch((error: Error) => {
                        this.logger_.error('Failed to update DevKit BSP:', error.message);
                        reject(error);
                    });
            } else {
                this.logger_.error('DevKit manager is not initialized.');
                reject(new Error('DevKit manager is not initialized.'));
            }
        });
        return ret;
    }

    private setIntellisenseProjectFromGUI(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.intellisense_?.setIntellisenseProject(request.data.project);
            this.context_.globalState.update('mtbintellisense', request.data.project);
            resolve();
        });
        return ret;
    }

    private restartExtension(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.doRestartExtension()
                .then(() => {
                    resolve();
                })
                .catch((error: Error) => {
                    reject(error);
                });
        });
        return ret;
    }

    private doRestartExtension(): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.logger_.info('Restarting the extension...');

            ModusToolboxEnvironment.destroy();

            this.sendMessageWithArgs('mtbMode', 'initializing') ;
            this.setupMgr_ = new SetupMgr(this);
            this.setupMgr_.on('downloadProgress', this.reportInstallProgress.bind(this));
            this.setupMgr_.on('addStatusLine', (line: string) => {
                this.sendMessageWithArgs('addStatusLine', line);
            });
            this.initialize()
                .then(() => {
                    this.sendMessageWithArgs('settings', this.settings_.settings);
                    resolve();
                })
                .catch((error: Error) => {
                    this.logger_.error('Failed to restart the extension:', error.message);
                    reject(error);
                });
        });
        return ret;
    }

    private reportInstallProgress(featureId: string, message: string, percent: number) {
        let msg: BackEndToFrontEndResponse = {
            response: 'installProgress',
            data: {
                featureId: featureId,
                message: message,
                percent: percent
            }
        };
        this.postWebViewMessage(msg);
    }

    private installTools(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (this.setupMgr_) {
                this.setupMgr_.installTools(request.data)
                    .then(() => {
                        this.sendMessageWithArgs('setupTab', 2);
                        resolve();
                    })
                    .catch((error: Error) => {
                        this.logger_.error('Failed to install tools:', error.message);
                        this.sendMessageWithArgs('error', `Error: ${error.message}`) ;
                        this.sendMessageWithArgs('mtbMode', 'error') ;
                        reject(error);
                    });
            } else {
                this.logger_.error('Setup manager is not initialized.');
                reject(new Error('Setup manager is not initialized.'));
            }
        });
        return ret;
    }

    private initSetup(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.chooseMTBLocation(request.data.type, request.data.path)
                .then(() => {
                    this.setupMgr_?.initialize().then(() => {
                        if (this.panel_) {
                            this.pushNeededTools();
                        }
                        resolve();
                    })
                    .catch((error) => {
                        this.sendMessageWithArgs('error', `Error: ${error.message}`) ;
                        this.sendMessageWithArgs('mtbMode', 'error') ;
                        reject(error);
                    });
                })
                .catch((error) => {
                    this.sendMessageWithArgs('error', `Error: ${error.message}`) ;
                    this.sendMessageWithArgs('mtbMode', 'error') ;                    
                    reject(error);
                });
        });
        return ret;
    }

    private tool(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let tool = this.getLaunchConfig(request.data.project ? request.data.project.name : '', request.data.tool.id);
            if (tool) {
                this.launch(tool);
            }
            resolve();
        });
        return ret;
    }

    private getLaunchConfig(project: string, uuid: string): Tool | undefined {
        let ret: Tool | undefined = undefined;
        let pinfo = this.projectInfo_.get(project);
        if (pinfo) {
            ret = pinfo.tools.find((t) => t.id === uuid);
        }
        return ret;
    }

    private launch(tool: Tool, reloadApp: boolean = false) : void {
        if (tool.launchData) {
            this.launchWithLaunchData(tool.launchData.cmdline, reloadApp);
        }
    }

    private launchWithLaunchData(cmdargs: string[], reloadApp: boolean = false) {
        let args: string[] = [];
        for (let i = 0; i < cmdargs.length; i++) {
            if (i !== 0) {
                args.push(cmdargs[i]);
            }
        }

        let envobj: any = {};
        let found = false;
        for (let key of Object.keys(process.env)) {
            if (key === 'CY_TOOLS_PATHS' && this.toolspath_) {//
                // Inject the tools path to be what we want, overriding the existing value
                // in the environment.
                //
                envobj[key] = this.toolspath_;
                found = true;
            }
            else if (key.indexOf("ELECTRON") === -1) {
                //
                // There are some environment variables that Electron sets that
                // can confuse launched tools, if they are electron-based.  So we do not pass those to the launched tool.
                //
                envobj[key] = process.env[key];
            }
        }

        if (!found) {
            envobj['CY_TOOLS_PATHS'] = this.toolspath_;
        }

        let opt: exec.SpawnOptionsWithoutStdio = {
            cwd: this.env_?.appInfo?.appdir,
            env: envobj,
            detached: true
        } ;
        let cp = exec.spawn(cmdargs[0], args, opt) ;
        cp.on('error', (err) => {
            this.logger_.error(`Failed to launch tool: ${err.message}`) ;
        }) ;

        cp.on('exit', (code, signal) => {
            if (reloadApp && this.env_ && this.env_.appInfo) {
                this.doRestartExtension()
                .catch((err) => {
                    this.logger_.error(`Failed to restart extension after tool exit: ${err.message}`) ;
                }) ;
            }
        });

        cp.stderr.on('data', (data) => {
            this.logger_.error(`Tool error output: ${data}`) ;
        });

        cp.stdout.on('data', (data) => {
            this.logger_.debug(`Tool output: ${data}`) ;
        }) ;
    }

    private launchLibraryManager(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let tool = this.getLaunchConfig('', MTBAssistObject.libmgrProgUUID);
            if (tool) {
                this.launch(tool, true);
            }
            resolve();
        });
        return ret;
    }

    private launchDeviceConfigurator(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let tool = this.getLaunchConfig('', MTBAssistObject.devcfgProgUUID);
            if (tool) {
                this.launch(tool);
            }
            else {
                vscode.window.showErrorMessage('Cannot find the device configurator tool.');
            }
            resolve();
        });
        return ret;
    }

    private runSetupProgram(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let tool = this.setupMgr_.findToolById(MTBAssistObject.setupPgmToolName);
            if (tool) {
                this.launchWithLaunchData([tool], false) ;
            }
            else {
                vscode.window.showErrorMessage('Setup program has not been installed.');
            }
            resolve();
        });
        return ret;
    }

    private open(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let uri : vscode.Uri ;

            if (request.data.location.startsWith('http') || request.data.location.startsWith('https:')) {
                uri = vscode.Uri.parse(request.data.location) ;
            }
            else {
                uri = vscode.Uri.file(request.data.location);
            }
            this.showWebContent(uri) ;
            resolve();
        });
        return ret;
    }

    private preInitializeManagers(): Promise<void> {
        let promise = new Promise<void>((resolve, reject) => {
            resolve();
        });
        return promise;
    }

    private postInitializeManagers(): Promise<void> {
        let promise = new Promise<void>((resolve, reject) => {
            this.devkitMgr_ = new MTBDevKitMgr(this);
            this.devkitMgr_.on('updated', this.sendDevKitStatus.bind(this));
            this.devkitMgr_.init()
                .then(() => {
                    this.postInitDone_ = true;
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

        if (!this.commandsInited_) {
            disposable = vscode.commands.registerCommand('mtbassist2.mtbMainPage', this.mtbMainPage.bind(this));
            this.context_.subscriptions.push(disposable);

            disposable = vscode.commands.registerCommand('mtbassist2.mtbMainPageNoTitle', this.mtbMainPage.bind(this));
            this.context_.subscriptions.push(disposable);            

            disposable = vscode.commands.registerTextEditorCommand('mtbassist2.mtbSymbolDoc',
                (editor: vscode.TextEditor, edit: vscode.TextEditorEdit, args: any[]) => {
                    this.mtbSymbolDoc(editor, edit, this.context_);
                });
            this.context.subscriptions.push(disposable);

            disposable = vscode.commands.registerCommand('mtbassist2.addBootloader', this.addBootloader.bind(this));
            this.context_.subscriptions.push(disposable);

            disposable = vscode.commands.registerCommand('mtbassist2.installLLVM', this.installLLVMCommand.bind(this));
            this.context_.subscriptions.push(disposable);    
            
            disposable = vscode.commands.registerCommand('mtbassist2.setOutputChannelLevel', this.setOutputChannelLevel.bind(this));
            this.context_.subscriptions.push(disposable);

            this.commandsInited_ = true;
        }
    }

    private setOutputChannelLevel() {
        const levels = ['silly', 'debug', 'verbose', 'http', 'info', 'warn', 'error'];
        vscode.window.showQuickPick(levels, {
            placeHolder: 'Select the output channel log level'
        }).then(selected => {
            if (selected) {
                this.context_.globalState.update('logLevel', selected);
                this.logger_.level = selected;
            }
        });
    }

    private installLLVMCommand() {
        this.installLLVM({ request: 'install-llvm', data: undefined }) ;
    }

    private async finishBootloader() {
        if (this.activeTask_ && this.activeTask_.ok) {
            fetch(MTBAssistObject.bootloaderDocUrl)
            .then(response => {
                if (!response.ok) {
                    vscode.window.showErrorMessage(`Failed to fetch bootloader documentation: ${response.statusText}`);
                    return ;
                }

                response.text().then(doc => {
                    const panel = vscode.window.createWebviewPanel(
                        'bootloaderDoc',
                        'Bootloader Documentation',
                        vscode.ViewColumn.One,
                        {}
                    );
                    panel.webview.html = doc;
                });
            })
            .catch(err => {
                vscode.window.showErrorMessage(`Failed to fetch bootloader documentation: ${err}`);
            }) ;
        }
    }

    private addBootloader() {
        if (!this.env) {
            this.logger_.error('internal error: ModusToolbox environment is not initialized.');
            return ;
        }

        if (!this.env.appInfo) {
            vscode.window.showErrorMessage('No ModusToolbox application is loaded in the current workspace.  Cannot add bootloader.');
            this.logger_.error('internal error: ModusToolbox application is not loaded.');
            return ;
        }

        if (!this.isPSOCEdge()) {
            vscode.window.showErrorMessage('the loaded application is not a PSOC Edge application. The bootloader can only be automatically added to PSOC Edge applications.');
            this.logger_.error('internal error: ModusToolbox application is not loaded.');
            return ;            
        }

        this.pendingStatusClosePromise = this.finishBootloader.bind(this) ;

        this.activeTask_ = new AddBootloaderTask(this) ;
        this.activeTask_.on('startOperation', (msg: string) => {
            this.sendMessageWithArgs('startOperation', msg) ;
        }) ;
        this.activeTask_.on('finishOperation', () => {
            this.sendMessageWithArgs('finishOperation', '') ;
        }) ;
        this.activeTask_.on('addStatusLine', (line: string) => {
            this.sendMessageWithArgs('addStatusLine', line) ;
        }) ;
        this.activeTask_.on('reveal', () => {
            if (this.panel_) {
                this.panel_.reveal() ;
            }
        }) ;
        this.activeTask_.run()
        .then(() => {
        })
        .catch((error) => {
            vscode.window.showErrorMessage('Failed to add bootloader: ' + error);
        });
    }

    private displayAssetDocs(asset: MTBAssetRequest, symbol: String) {
        // TODO: Implement the logic to display asset documentation
    }

    private findAssetByPath(p: string): MTBAssetRequest | undefined {
        let ret: MTBAssetRequest | undefined = undefined;

        for (let proj of this.env_!.appInfo!.projects) {
        }

        return ret;
    }

    private mtbSymbolDoc(editor: vscode.TextEditor, edit: vscode.TextEditorEdit, context: vscode.ExtensionContext) {
        if (vscode.window.activeTextEditor) {
            let uri: vscode.Uri = editor.document.uri;
            let pos: vscode.Position = editor.selection.active;

            //
            // First try to look up in our symbol index
            //
            let range = editor.document.getWordRangeAtPosition(pos);
            let symbol = editor.document.getText(range);

            if (this.keywords_.contains(symbol)) {
                let url: string | undefined = this.keywords_.getUrl(symbol);
                if (url) {
                    let uri = vscode.Uri.parse('file:' + url) ;
                    this.showWebContent(uri) ;
                }
            }
            else {
                vscode.commands.executeCommand("vscode.executeDefinitionProvider", uri, pos)
                    .then(value => {
                        let locs: vscode.Location[] = value as vscode.Location[];
                        if (locs.length > 0) {
                            for (let loc of locs) {
                                this.logger_.debug("Found symbol '" + symbol + "' at " + loc.uri.fsPath);
                                let asset: MTBAssetRequest | undefined = this.findAssetByPath(loc.uri.fsPath);
                                if (asset) {
                                    this.displayAssetDocs(asset, symbol);
                                    return;
                                }
                            }
                            let msg: string = "Symbol under cursors is not part of an asset.";
                            vscode.window.showInformationMessage(msg);
                        }
                        else {
                            vscode.window.showInformationMessage("Text under cursor is not a 'C' symbol");
                        }
                    });
            }
        }
    }

    private isPossibleMTBApplication(): boolean {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            this.logger_.debug('no workspace folders found - can not be a ModusToolbox application.');
            return false;
        }

        let makepath1 = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'makefile');
        let makepath2 = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'Makefile');

        if (!fs.existsSync(makepath1) && !fs.existsSync(makepath2)) {
            this.logger_.debug('no makefile found in the workspace root - cannot be a ModusToolbox application.');
            return false;
        }

        return true;
    }

    private mtbApplicationDirectory(): string | undefined {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            this.logger_.debug('no workspace folders found - cannot determine ModusToolbox application directory.');
            return undefined;
        }
        let workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        return workspaceFolder;
    }

    private loadMTBApplication(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.isPossibleMTBApplication()) {
                let flags: MTBLoadFlags = MTBLoadFlags.packs | MTBLoadFlags.tools;
                this.env_!.load(flags, undefined, this.toolspath_).then(() => {
                    this.envLoaded_ = true;
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
                    resolve() ;
                    return;
                }

                this.logger_.debug(`ModusToolbox application detected - loading '${appDir}'`);

                //
                // Load the ModusToolbox application w/ packs and tools
                //
                let flags: MTBLoadFlags = MTBLoadFlags.appInfo | MTBLoadFlags.packs | MTBLoadFlags.tools;
                this.env_!.load(flags, appDir, this.toolspath_).then(() => {
                    this.envLoaded_ = true;
                    this.logger_.info('ModusToolbox application loaded successfully.');
                    resolve();
                }).catch((error: Error) => {
                    flags = MTBLoadFlags.packs | MTBLoadFlags.tools;
                    ModusToolboxEnvironment.destroy() ;
                    this.env_ = ModusToolboxEnvironment.initInstance(this.logger_, this.settings_) ;
                    this.env_!.load(flags, undefined, this.toolspath_).then(() => {
                        this.envLoaded_ = true;
                        this.logger_.info('ModusToolbox environment loaded with application successfully.');
                        resolve();                        
                    }) ;
                });
            }
        });
    }

    private mtbMainPage(args: any[]) {
        this.logger_.debug('Showing ModusToolbox main page.');
        this.showLocalContent('index.html');
    }

    private getDocHTML(uri: vscode.Uri): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let html: string = '' ;

            if (uri.scheme === 'file') {
                let fname = uri.fsPath ;
                try {
                    html = fs.readFileSync(fname, 'utf8') ;
                    resolve(html) ;
                }
                catch(err) {
                    reject(err) ;
                }
            }
            else {
                fetch(uri.toString()).then(response => {
                    if (response.ok) {
                        let html = response.text();
                        resolve(html) ;
                    }
                    else {
                        reject(new Error(`HTTP error ${response.status}: ${response.statusText}`)) ;
                    }
                });
            }
        }) ;
    }

    //
    // Save: maybe use this later.  This shows web content in a vscode webview panel
    //       There are display issues that need to be figure out before it is usable.
    //
    private showWebContentEmbedded(uri: vscode.Uri) {
        this.getDocHTML(uri)
        .then((html) => {
            if (!this.content_) {
                this.content_ = vscode.window.createWebviewPanel(
                    'mtbassist.content',
                    'ModusToolbox Documentation',
                    vscode.ViewColumn.One,
                    {
                        enableScripts: true,
                    }
                );
            }            
            this.content_.webview.html = html ;
            this.content_.onDidDispose(() => {
                this.content_ = undefined;
            }, null, this.context_.subscriptions);
        })
        .catch((err) => {
            this.logger_.error(`Failed to load documentation: ${err.message}`);
            vscode.window.showErrorMessage(`Failed to load documentation: ${err.message}`) ;
        });
    }

    private showWebContentExternal(uri: vscode.Uri) {
        if (uri.scheme === 'file') {
            this.logger_.debug(`Opening local documentation: ${uri.fsPath}`);
            browseropen(uri.toString()) ;
        }
        else {
            vscode.env.openExternal(uri);
        }
    }

    private showWebContent(uri: vscode.Uri) {
        let ext = this.showContentExternal_ ;

        if (uri.path.endsWith('.pdf')) {
            ext = true ;
        }

        if (ext) {
            this.showWebContentExternal(uri);
        }
        else {
            this.showWebContentEmbedded(uri) ;
        }
    }


    private mtbLaunchPath(): string | undefined {
        let tool = this.env_!.toolsDB.findToolByGUID(MTBAssistObject.mtbLaunchUUID);
        if (tool === undefined) {
            return undefined;
        }

        return path.join(tool.path, MTBAssistObject.mtbLaunchToolName);
    }

    private addLaunch(proj: string, cfg: any) {
        let pinfo = this.projectInfo_.get(proj);
        if (!pinfo) {
            return;
        }

        pinfo.tools = pinfo.tools.filter(tool => tool.id !== cfg.id);
        let tool: Tool = {
            name: cfg['display-name'],
            id: cfg.id,
            version: cfg.version,
            launchData: cfg
        };
        pinfo.tools.push(tool);
    }

    private addDoc(proj: string, cfg: any) {
        let pinfo = this.projectInfo_.get(proj);
        if (!pinfo) {
            return;
        }

        pinfo.documentation = pinfo.documentation.filter(doc => doc.location !== cfg.location);
        let doc: Documentation = {
            name: cfg.title,
            location: cfg.location,
        };
        pinfo.documentation.push(doc);
    }

    private procesMtbLaunchData(data: any) {
        if (data && data.configs && Array.isArray(data.configs)) {
            for (let cfg of data.configs) {
                if (cfg.scope) {
                    if (cfg.scope === 'global' || cfg.scope === 'bsp') {
                        this.addLaunch('', cfg);
                    }
                    else if (cfg.scope === 'project') {
                        this.addLaunch(cfg.project, cfg);
                    }
                }
            }
        }

        if (data && data.documentation && Array.isArray(data.documentation)) {
            for (let cfg of data.documentation) {
                if (cfg.project === '') {
                    this.addDoc('', cfg);
                }
                else {
                    this.addDoc(cfg.project, cfg);
                }
            }
        }
    }

    private async getLaunchData(): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let cwd = process.cwd();
            let cmd = this.mtbLaunchPath();
            if (!cmd) {
                this.logger_.error('mtblaunch tool not found - cannot get launch data.');
                resolve();
                return;
            }

            let args : string[] = ['--quick', '--docs', '--app', this.env_!.appInfo!.appdir] ;
            let opts: MTBRunCommandOptions = {
                toolspath: this.toolspath_,
            } ;
            ModusToolboxEnvironment.runCmdCaptureOutput(this.logger_, cmd, args, opts)
                .then((result) => {
                    if (result[0] !== 0) {
                        this.logger_.debug(`mtblaunch output: ${result[1].join('\n')}`);
                        resolve();
                    }
                    else {
                        try {
                            let str = result[1].join('\n');
                            if (str.startsWith('//')) {
                                str = str.substring(2).trim(); // Remove leading comment slashes
                            }
                            let obj = JSON.parse(str);
                            this.procesMtbLaunchData(obj);
                        } catch (error) {
                            let errobj = error as Error;
                            this.logger_.error('Error parsing mtblaunch output:', errobj.message);
                        }
                        resolve();
                    }
                });
        });
        return ret;
    }

    private getMiddlewareFromEnv(proj: MTBProjectInfo): Middleware[] {
        let ret: Middleware[] = [];
        let a: MTBAssetRequest;
        for (let asset of proj.assetsRequests) {
            let newer = false;
            let item = this.env_!.manifestDB.findItemByID(asset.repoName());
            if (item) {
                let versions = item.newerVersions(asset.commit());
                if (versions.length > 0) {
                    newer = true;
                }
            }
            let mw: Middleware = {
                name: asset.repoName(),
                version: asset.commit(),
                newer: newer
            };
            ret.push(mw);
        }
        return ret;
    }

    private getComponentInfo(envp: MTBProjectInfo): ComponentInfo[] {
        let ret: ComponentInfo[] = [];
        for (let comp of envp.components) {
            if (!envp.disabledComponents.includes(comp)) {
                let cinfo: ComponentInfo = {
                    name: comp,
                    description: this.compDescMap_.get(comp) || '',
                };
                ret.push(cinfo);
            }
        }
        return ret;
    }

    private createAppStructure() {
        if (!this.env_ || !this.env_.has(MTBLoadFlags.appInfo)) {
            this.logger_.debug('No ModusToolbox application info found - cannot create app structure.');
            return;
        }

        for (let proj of this.env_!.appInfo!.projects || []) {
            let project: Project = {
                name: proj.name,
                documentation: [],
                middleware: this.getMiddlewareFromEnv(proj),
                tools: [],
                missingAssets: proj.missingAssets.length > 0,
                missingAssetDetails: proj.missingAssets.map((asset) => asset.name()),
                components: this.getComponentInfo(proj)
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
            components: []
        });
    }

    private onToolsPathChanged(newdir: string) {
        this.logger_.info(`Tools path changed to: ${newdir}`);
        this.toolspath_ = newdir;

        let options: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: "ModusToolbox: ",
            cancellable: false
        };
        vscode.window.withProgress(options, (progress) => {
            let p = new Promise<void>((resolve, reject) => {
                progress.report({ message: "Reloading ModusToolbox application" });

                let appsdir: string | undefined = undefined;
                let flags: MTBLoadFlags = MTBLoadFlags.packs | MTBLoadFlags.tools | MTBLoadFlags.reload;
                if (this.env_!.appInfo) {
                    flags |= MTBLoadFlags.appInfo;
                    appsdir = this.env_!.appInfo?.appdir;
                }

                this.env_!.load(flags, appsdir, this.toolspath_)
                    .then(() => {
                        progress.report({ message: "Updating all tasks" });
                        this.tasks_?.clear();
                        this.tasks_?.forEach((t) => { t.addRequiredTasks(); });
                        this.vscodeSettings_?.fix() ;
                        this.sendMessageWithArgs('appStatus', this.getAppStatusFromEnv());
                        this.sendMessageWithArgs('settings', this.settings_.settings);
                        resolve();
                    })
                    .catch((err: Error) => {
                        this.logger_.error('Error reloading ModusToolbox application:', err);
                        reject(err);
                    });
            });
            return p;
        });
    }

    private sendLCSData() {
        this.sendMessageWithArgs('lcsBspsIn', this.lcsMgr_!.bspsIn);
        this.sendMessageWithArgs('lcsToAdd', this.lcsMgr_!.toAdd);
        this.sendMessageWithArgs('lcsToDelete', this.lcsMgr_!.toDelete);
    }

    private pushNeedsUpdate() {
        this.sendMessageWithArgs('lcsNeedsUpdate', this.lcsMgr_!.needsUpdate);
    }

    private pushNeedsApply() {
        this.sendMessageWithArgs('lcsNeedsApply', this.lcsMgr_!.needsApplyChanges);
    }

    private computeTheme(): void {
        let t = vscode.window.activeColorTheme;
        switch (t.kind) {
            case vscode.ColorThemeKind.Light:
                this.theme_ = 'light';
                break;
            case vscode.ColorThemeKind.Dark:
                this.theme_ = 'dark';
                break;
            case vscode.ColorThemeKind.HighContrast:
                this.theme_ = 'dark';
                break;
            case vscode.ColorThemeKind.HighContrastLight:
                this.theme_ = 'light';
                break;
            default:
                this.theme_ = 'light';
                break;
        }
    }

    private sendTheme() {
        this.computeTheme();
        this.sendMessageWithArgs('setTheme', this.theme_);
    }

    private pushNeededTools() {
        this.sendMessageWithArgs('neededTools', this.setupMgr_!.neededTools);
    }

    private findCodeWorkspaceFiles(dir: string): string[] {
        try {
            const files = fs.readdirSync(dir);
            return files
                .filter(f => f.endsWith('.code-workspace'))
                .map(f => path.join(dir, f));
        } catch (err) {
            this.logger_.error(`Error reading directory ${dir}: ${err}`);
            return [];
        }
    }

    private openReadme(req: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve) => {
            let readmePath = path.join(this.env_!.appInfo!.appdir, 'README.md');
            if (fs.existsSync(readmePath)) {
                let uri = vscode.Uri.file(readmePath);
                vscode.commands.executeCommand("markdown.showPreview", uri);
            } else {
                vscode.window.showErrorMessage(`README.md not found in ${readmePath}.`);
            }
            resolve();
        });
        return ret;
    }

    private openRecent(req: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve) => {
            let dir = req.data as string;
            let files = this.findCodeWorkspaceFiles(dir);
            if (files.length === 1) {
                let wkspuri = vscode.Uri.file(files[0]);
                vscode.commands.executeCommand("vscode.openFolder", wkspuri);
            } else if (files.length === 0) {
                vscode.window.showErrorMessage(`No vscode workspace files (*.code-workspace) found in ${dir}.`);
            }
            else {
                vscode.window.showErrorMessage(`Multiple vscode workspace files (*.code-workspace) found in ${dir}.`);
            }
            resolve();
        });
        return ret;
    }

    private recentlyOpened(req: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve) => {
            this.sendMessageWithArgs('recentlyOpened', this.recents_!.recentlyOpened);
            resolve();
        });
        return ret;
    }

    private computeManifestStatus() {
        this.manifestStatus_ = 'loading' ;
        if (this.env_ && this.env_.manifestDB && this.env_.manifestDB.errorLoading) {
            this.manifestStatus_ = 'not-available';
        } else if (this.env_ && !this.env_.isLoading && this.env_.has(MTBLoadFlags.manifestData)) {
            this.manifestStatus_ = 'loaded';
        }

    }

    private sendManifestStatus() {
        this.computeManifestStatus();
        this.sendMessageWithArgs('manifestStatus', this.manifestStatus_);        
    }

    private updateFirmware(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.devkitMgr_?.updateFirmware(request.data.serial);
        });
        return ret;
    }

    private refreshDevKits(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.devkitMgr_?.scanForDevKits()
                .then(() => {
                    this.sendDevKitStatus();
                    resolve();
                });
        });
        return ret;
    }

    private sendDevKitStatus() {
        this.sendMessageWithArgs('devKitStatus', this.devkitMgr_?.devKitInfo || []);
    }

    private getAppStatusFromEnv(): ApplicationStatusData {
        let appst: ApplicationStatusData;
        if (this.env_ && this.env_.has(MTBLoadFlags.appInfo)) {
            let pinfo = this.projectInfo_.get('');

            let projects = [...this.projectInfo_.values()].filter((proj) => proj.name !== '').sort((a, b) => a.name.localeCompare(b.name));
            for (let p of projects) {
                let envp = this.env_!.appInfo!.projects?.find((proj) => proj.name === p.name);
                if (envp) {
                    p.missingAssets = envp.missingAssets.length > 0;
                    p.missingAssetDetails = envp.missingAssets.map((asset) => asset.name());
                    p.middleware = this.getMiddlewareFromEnv(envp);
                    p.components = this.getComponentInfo(envp);
                }
            }

            let needVSCode = false;
            let vscodePath = path.join(this.env_!.appInfo!.appdir, '.vscode');
            if (!fs.existsSync(vscodePath)) {
                needVSCode = true;
            }

            this.logger_.debug(`Found ${projects.length} projects in the application.`);
            let tools: Tool[] = [];
            if (pinfo && pinfo.tools) {
                tools = pinfo.tools.filter((tool) => (tool.id !== MTBAssistObject.libmgrProgUUID && 
                                                      tool.id !== MTBAssistObject.devcfgProgUUID && 
                                                      tool.id !== MTBAssistObject.projectCreatorUUID &&
                                                      tool.id !== MTBAssistObject.setupPgmUUID));
            }

            let msg : string | undefined = undefined ;
            let msgButton : string | undefined = undefined ;
            let msgRequest : FrontEndToBackEndType | undefined = undefined ;
            let msgHelp: string | undefined = undefined ;
            let config = vscode.workspace.getConfiguration();            
            let autodisp = config.get('mtbassist2.disableLLVMNag') as boolean ;

            if (this.isPSOCEdge() && !this.settings_.hasLLVM && !autodisp) {
                //
                // See if we need to install the LLVM compiler
                //
                msg = 'The LLVM compiler is useful for many PSOC Edge projects. Do you want to install it?' ;
                msgButton = 'Install LLVM' ;
                msgRequest = 'install-llvm' ;
                msgHelp = 'There is a VSCode extension setting that disables this prompt.  See File/Preferences/Settings and search for "mtbassist2.disablellvmnag".' ;
            }

            let vscTaskStatus : MTBVSCodeTaskStatus= 'good' ;
            let vscSettingStatus : MTBVSCodeSettingsStatus = 'good' ;

            if (!needVSCode) {
                for(let tasks of this.tasks_.values()) {
                    if (tasks.taskFileStatus !== 'good') {
                        vscTaskStatus = tasks.taskFileStatus || 'missing' ;
                        vscTaskStatus = 'needsTasks' ;
                        break ;
                    }
                }

                vscSettingStatus = this.vscodeSettings_?.status || 'missing' ;
            }

            let readme: string = path.join(this.env_!.appInfo!.appdir, 'README.md') ;
            if (!fs.existsSync(readme)) {
                readme = '' ;
            }
        
            appst = {
                valid: true,
                name: this.env_.appInfo?.appdir || '',
                toolsdir: this.env_.toolsDir!,
                documentation: pinfo?.documentation || [],
                middleware: [],
                projects: projects,
                tools: tools,
                vscodeTasksStatus: vscTaskStatus,
                vscodeSettingsStatus: vscSettingStatus,
                needVSCode: needVSCode,
                generalMessage: msg,
                generalMessageButtonText: msgButton,
                generalMessageRequest: msgRequest,
                generalMessageHelp: msgHelp,
                configuration: this.settings_.configuration,
                readme: readme
            };
        } else {
            appst = {
                valid: false,
                name: '',
                toolsdir: this.settings_.toolsPath ? this.settings_.toolsPath : '',
                documentation: [],
                middleware: [],
                projects: [],
                tools: [],
                vscodeTasksStatus: 'good',
                vscodeSettingsStatus: 'good',
                needVSCode: false,
                configuration: 'Debug',
                readme: ''
            };
        }
        return appst;
    }

    private showRedisplayHint() {
        let config = vscode.workspace.getConfiguration();
        let autodisp = config.get('mtbassist2.displayHint') as boolean ;
        if (autodisp) {
            vscode.window.showInformationMessage(`Click the ModusToolbox Assistant icon in the Activity Bar to redisplay the assistant.`) ;
        }
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

            let data = fs.readFileSync(fullpath.fsPath, 'utf8');
            this.panel_.webview.html = data;

            this.panel_.onDidDispose(() => {
                this.showRedisplayHint() ;
                this.panel_ = undefined;
            }, null, this.context_.subscriptions);

            this.panel_.webview.onDidReceiveMessage((message) => {
                if (message.request !== 'logMessage') {
                    this.logger_.debug(`server: Received message: ${JSON.stringify(message)}`);
                }
                let handler = this.cmdhandler_.get(message.request);
                if (handler) {
                    handler(message)
                        .then(() => {
                            this.logger_.silly(`Handled command ${message.request} successfully.`);
                        })
                        .catch((error: Error) => {
                            this.logger_.error(`Error handling command ${message.request}: ${error.message}`);
                        });
                } else {
                    this.logger_.error(`No handler found for vscode command: ${message.request}`);
                }
            });
        }
        else {
            this.panel_.reveal();
        }
    }

    private gettingStarted(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve) => {
            this.showWebContent(vscode.Uri.parse('https://infineon-academy.csod.com/ui/lms-learning-details/app/video/aca8371d-45ae-4688-9289-e19c22057636'));
            resolve();
        });
        return ret;
    }

    private documentation(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve) => {
            this.showWebContent(vscode.Uri.parse('https://documentation.infineon.com/modustoolbox/docs/zhf1731521206417'));
            resolve();
        });
        return ret;
    }

    private browseExamples(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve) => {
            this.showWebContent(vscode.Uri.parse('https://github.com/Infineon/Code-Examples-for-ModusToolbox-Software'));
            resolve();
        });
        return ret;
    }

    private community(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve) => {
            this.showWebContent(vscode.Uri.parse('https://community.infineon.com/t5/ModusToolbox/bd-p/modustoolboxforum/'));
            resolve();
        });
        return ret;
    }

    private browseForFolder(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve) => {
            let txt : string = request.data.button ? request.data.button : 'Select Folder' ;
            vscode.window.showOpenDialog({
                canSelectMany: false,
                openLabel: txt,
                canSelectFiles: false,
                canSelectFolders: true
            }).then((uri) => {
                let resp: BackEndToFrontEndResponse;
                if (!uri || uri.length === 0) {
                    this.logger_.debug('No folder selected in browseFolder dialog.');
                    this.sendMessageWithArgs('browseForFolderResult', undefined);
                    this.sendMessageWithArgs('browseForFolderResult', undefined);
                }
                else {
                    if (request.data === 'find-tools-location') {
                        this.findToolsLocation(uri[0].fsPath);
                    }
                    else {
                        this.sendMessageWithArgs('browseForFolderResult', { tag: request.data.tag, path: uri[0].fsPath });
                    }
                }

                resolve();
            });
        });
        return ret;
    }

    private browseForFile(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve) => {
            vscode.window.showOpenDialog({
                canSelectMany: false,
                openLabel: 'Select File',
                canSelectFiles: true,
                canSelectFolders: false
            }).then((uri) => {
                let resp: BackEndToFrontEndResponse;
                if (!uri || uri.length === 0) {
                    this.logger_.debug('No file selected in browseFile dialog.');
                    this.sendMessageWithArgs('browseForFileResult', undefined);
                }
                else {
                    resp = { response: 'browseForFileResult', data: { tag: request.data, path: uri[0].fsPath } };
                }
                resolve();
            });
        });
        return ret;
    }

    private findToolsLocation(dir: string) {
        if (!fs.existsSync(dir)) {
            this.sendMessageWithArgs('tools-loc-error', `The path ${dir} does not exist.`);
        }
        else {
            let found = false ;
            for(let file of fs.readdirSync(dir)) {
                if (/^version-[0-9]+.[0-9]+.[0-9]+.xml$/.test(file)) {
                    found = true ;
                }
            }
            if (!found) {
                this.sendMessageWithArgs('tools-loc-error', `The path '${dir}' is not a valid tools location - missing version XML file.`);
            }
            else {
                this.settings_.toolsPath = dir ;
                this.doRestartExtension() ;
            }
        }
    }

    public getTerminalCWD(): string {
        if (this.env_ && this.env_.appInfo && this.env_.appInfo.appdir) {
            return this.env_!.appInfo!.appdir;
        }
        return os.homedir();
    }

    public getTerminalToolsPath(): string | undefined {
        return this.toolsDir;
    }

    private createModusShellTerminal(): Promise<void> {
        let ret = new Promise<void>((resolve) => {

            let shtool = this.env_!.toolsDB.findToolByGUID(MTBAssistObject.modusShellUUID);
            if (!shtool) {
                this.logger_.error('ModusToolbox shell tool not found - cannot create terminal profile.');
                resolve();
                return;
            }

            let shpath = path.join(shtool.path, 'bin', 'bash');
            if (process.platform === "win32") {
                shpath += ".exe";
            }

            try {
                if (!this.termRegistered_) {
                    let assetobj = this;
                    vscode.window.registerTerminalProfileProvider('mtbassist2.mtbShell', {
                        provideTerminalProfile(token: vscode.CancellationToken): vscode.ProviderResult<vscode.TerminalProfile> {
                            return {
                                options: {
                                    name: "ModusToolbox Shell",
                                    shellPath: shpath,
                                    shellArgs: ["--login"],
                                    cwd: assetobj.env!.appInfo!.appdir,
                                    isTransient: true,
                                    env: {
                                        ["HOME"]: os.homedir(),
                                        ["PATH"]: "/bin:/usr/bin",
                                        ["CHERE_INVOKING"]: assetobj.getTerminalCWD(),
                                        ["CY_TOOLS_PATHS"]: assetobj.getTerminalToolsPath()
                                    },
                                    strictEnv: false,
                                    message: "Welcome To ModusToolbox Shell",
                                }
                            };
                        }
                    });
                    this.termRegistered_ = true;
                    this.logger_.debug('ModusToolbox shell terminal profile registered.');
                    resolve() ;
                }
                else {
                    resolve() ;
                }
            }
            catch (err) {
                resolve();
            }
        });
        return ret;
    }

    private logMessage(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve) => {
            let resp: BackEndToFrontEndResponse | null = null;

            let str = '';
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
                switch (type) {
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
            resolve();
        });
        return ret;
    }

    private getBSPs(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve) => {
            if (!this.env_) {
                this.logger_.error('request for BSPs when ModusToolbox environment is not initialized');
                resolve();
                return;
            }
            this.sendBSPInformation();
        });
        return ret;
    }

    private convertCodeExamples(examples: MTBApp[]): CodeExampleIdentifier[] {
        let codeExamples: CodeExampleIdentifier[] = [];
        for (let example of examples) {
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

    private getCodeExamples(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (this.env_) {
                this.env_.manifestDB.getCodeExamplesForBSP(request.data.id)
                    .then((examples) => {
                        this.sendMessageWithArgs('sendCodeExamples', this.convertCodeExamples(examples));
                        resolve();
                    })
                    .catch((error) => {
                        this.logger_.error(`Error retrieving code examples: ${error.message}`);
                        reject(error);
                    });
            }
        });
        return ret;
    }

    private createProject(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let fpath = path.join(request.data.location, request.data.name);
            if (!fs.existsSync(fpath)) {
                fs.mkdirSync(fpath, { recursive: true });
            }
            this.context_.globalState.update(MTBAssistObject.lastProjectPath, request.data.location);
            this.worker_!.createProject(request.data.location, request.data.name, request.data.bsp.id, request.data.example.id)
                .then(([status, messages]) => {
                    if (status === 0) {
                        this.sendMessageWithArgs('createProjectResult',
                            {
                                uuid: request.data.uuid,
                                success: true
                            });
                    } else {
                        this.bringChannelToFront() ;
                        this.sendMessageWithArgs('createProjectResult',
                            {
                                uuid: request.data.uuid,
                                success: false,
                                message: messages.join('\n')
                            });
                    }
                    resolve();
                })
                .catch((error) => {
                    this.logger_.error(`Error creating project: ${error.message}`);
                    reject(error);
                });
        });
        return ret;
    }


    private loadWorkspace(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (this.worker_) {
                let projpath = path.join(request.data.path, request.data.project);
                this.worker_.loadWorkspace(projpath, request.data.project, request.data.example)
                    .then(() => {
                        resolve();
                    })
                    .catch((error) => {
                        this.logger_.error(`Error loading workspace: ${error.message}`);
                        reject(error);
                    });
            }
        });
        return ret;
    }

    public fixMissingAssetsForProject(projname: string) : Promise<void> {
        return this.worker_!.fixMissingAssets(projname) ;
    }

    private fixMissingAssets(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (!this.worker_) {
                // Should never happen
                reject(new Error('Extension is not initialized correctly'));
                return;
            }

            this.fixMissingAssetsForProject(request.data as string)
            .then(() => { 
                this.env_?.reloadAppInfo()
                    .then(() => {
                        this.sendMessageWithArgs('appStatus', this.getAppStatusFromEnv());
                        resolve();
                    })
                    .catch((error) => {
                        this.logger_.error(`Error reloading app info after fixing assets: ${error.message}`);
                        reject(error);
                    });
            })
            .catch((err) => { 
                reject(err) ;
            }) ;
        }) ;
        return ret ;
    }

    private runAction(request: FrontEndToBackEndRequest): Promise<void> {
        let ret = new Promise<void>((resolve) => {
            this.worker_?.runAction(request.data.action, request.data.project)
                .then(() => {
                    resolve();
                });
        });
        return ret;
    }

    private isPSOCEdge() {
        if (!this.env_ || !this.env_.appInfo || this.env_.appInfo.projects.length === 0) {
            return false ;
        }

        // TODO: need a better way to do this
        return this.env_.appInfo.projects[0].device.startsWith('PSE') ;
    }
}
