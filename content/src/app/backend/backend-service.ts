import { Injectable, OnDestroy, OnInit, Pipe } from '@angular/core';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { PipeInterface } from './pipes/pipeInterface';
import { ElectronPipe } from './pipes/electronPipe';
import { VSCodePipe } from './pipes/vscodePipe';
import { BrowserPipe } from './pipes/browserPipe';
import { BackEndToFrontEndResponse, BSPIdentifier, FrontEndToBackEndRequest, ApplicationStatusData, BackEndToFrontEndType, DevKitInfo, RecentEntry, FrontEndToBackEndType, SetupProgram, InstallProgress, MTBAssistantMode, GlossaryEntry, MTBSetting, BrowseResult, CodeExampleIdentifier, SettingsError, ThemeType, ManifestStatusType } from '../../comms';
import { ProjectManager } from './projectmgr';
import { App } from '../app';

declare var acquireVsCodeApi: any | undefined ;

@Injectable({
    providedIn: 'root'
})
export class BackendService {
    private pipe_?: PipeInterface ;
    private projectManager_ : ProjectManager ;
    private ready_ : boolean = false ;

    // Handler for messages from the backend
    private handlers_ : Map<string, (cmd: BackEndToFrontEndResponse) => void> = new Map<string, (cmd: BackEndToFrontEndResponse) => void>();

    // Dispay related
    theme: BehaviorSubject<ThemeType> = new BehaviorSubject<ThemeType>('dark');
    navTab: BehaviorSubject<number> = new BehaviorSubject<number>(0) ;
    setupTab: BehaviorSubject<number> = new BehaviorSubject<number>(0) ;
    browserFolder: BehaviorSubject<BrowseResult | null> = new BehaviorSubject<BrowseResult | null>(null);
    browserFile: BehaviorSubject<BrowseResult | null> = new BehaviorSubject<BrowseResult | null>(null);

    // Application related
    appStatusData: BehaviorSubject<ApplicationStatusData | null> = new BehaviorSubject<ApplicationStatusData | null>(null);
    loadedAsset: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

    // Install and setup related
    neededTools: BehaviorSubject<SetupProgram[]> = new BehaviorSubject<SetupProgram[]>([]);
    progressMessage: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
    progressPercent: BehaviorSubject<number | null> = new BehaviorSubject<number | null>(null);
    installProgress: BehaviorSubject<InstallProgress | null> = new BehaviorSubject<InstallProgress | null>(null);
    homeError: BehaviorSubject<string | undefined> = new BehaviorSubject<string | undefined>(undefined);
    customError: BehaviorSubject<string | undefined> = new BehaviorSubject<string | undefined>(undefined);
    customWarning: BehaviorSubject<string | undefined> = new BehaviorSubject<string | undefined>(undefined);
    homeWarning: BehaviorSubject<string | undefined> = new BehaviorSubject<string | undefined>(undefined);
    justNeedTools: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    // Settings related
    settings: BehaviorSubject<MTBSetting[]> = new BehaviorSubject<MTBSetting[]>([]);
    settingsErrors: BehaviorSubject<SettingsError[]> = new BehaviorSubject<SettingsError[]>([]);

    // Extension state
    mtbMode: BehaviorSubject<MTBAssistantMode> = new BehaviorSubject<MTBAssistantMode>('initializing');    
    errorMessage: BehaviorSubject<string> = new BehaviorSubject<string>('Default Error Message');
    ready: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    // MISC
    glossaryEntries: BehaviorSubject<GlossaryEntry[]> = new BehaviorSubject<GlossaryEntry[]>([]);
    intellisenseProject: BehaviorSubject<string> = new BehaviorSubject<string>('');
    recentlyOpened: BehaviorSubject<RecentEntry[]> = new BehaviorSubject<RecentEntry[]>([]);
    devKitStatus: BehaviorSubject<DevKitInfo[]> = new BehaviorSubject<DevKitInfo[]>([]);
    defaultProjectDir: BehaviorSubject<string> = new BehaviorSubject<string>('') ;

    // Manfiest related
    manifestStatus: BehaviorSubject<ManifestStatusType> = new BehaviorSubject<ManifestStatusType>('loading') ;
    allBSPs: BehaviorSubject<BSPIdentifier[]> = new BehaviorSubject<BSPIdentifier[]>([]);
    allBSPsExceptEAP: BehaviorSubject<BSPIdentifier[]> = new BehaviorSubject<BSPIdentifier[]>([]);    
    activeBSPs: BehaviorSubject<BSPIdentifier[]> = new BehaviorSubject<BSPIdentifier[]>([]) ;
    codeExample: BehaviorSubject<CodeExampleIdentifier[]> = new BehaviorSubject<CodeExampleIdentifier[]>([]) ;

    // LCS related
    bspsNotIn: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
    bspsIn: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
    lcsToAdd: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
    lcsToDelete: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
    lcsNeedsUpdate: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    lcsNeedsApply: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    lcsBusy: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    // AI related
    aiApiKey : BehaviorSubject<any> = new BehaviorSubject<any>(undefined);

    // Data members
    private allBSPExceptEAPData : BSPIdentifier[] = [] ;

    constructor() {
        this.pipe_ = this.createPipe() ;
        if (this.pipe_) {
            this.pipe_.registerResponseHandler(this.messageProc.bind(this));
        }
        this.projectManager_ = new ProjectManager(this);
        this.setupHandlers();   

        this.sendRequestWithArgs('check-ready', null) ;
    }

    public registerHandler(cmd: BackEndToFrontEndType, handler: (cmd: BackEndToFrontEndResponse) => void): void {  
        if (this.handlers_.has(cmd)) {
            this.log(`Warning: Overriding existing handler for command: ${cmd}`) ;
        }
        this.handlers_.set(cmd, handler);
    }

    public log(message: string, type?: string) {
        if (this.pipe_ && this.ready_) {
            this.pipe_.sendRequest({
                request: 'logMessage',
                data: {
                    message: message,
                    type: type || 'debug'
                }
            });
        }
    }

    public fixMissingAssets(project: any): void { 
        this.log('Requesting fix for missing assets ${project.name}');
        if (this.pipe_) {
            this.log(`Sending request to fix missing assets for project: ${JSON.stringify(project)}`);
            this.pipe_.sendRequest({
                request: 'fixMissingAssets',
                data: project.name
            });
        }
    }

    public sendRequest(request: FrontEndToBackEndRequest) : void {
        if (this.pipe_) {
            this.pipe_.sendRequest(request);
        }
    }

    public sendRequestWithArgs(cmd: FrontEndToBackEndType, data: any) {
        if (this.pipe_) {
            this.pipe_!.sendRequest({
                request: cmd,
                data: data
            });
        }
    }

    public setNavTab(index: number) {
        this.navTab.next(index);
    }

    public setSetupTab(index: number) {
        this.setupTab.next(index);
    }

    public browseForFolder(tag: string): void{
        this.log('Requesting browser for folder');
            if (this.pipe_) {
                this.pipe_.sendRequest({
                    request: 'browseForFolder',
                    data: tag
                });
            }
    }

    public browseForFile(tag: string): void{
        this.log('Requesting browser for file');
            if (this.pipe_) {
                this.pipe_.sendRequest({
                    request: 'browseForFile',
                    data: tag
                });
            }
    }    

    public async createProject(projectData: any): Promise<boolean> {
        return this.projectManager_.createProject(projectData);
    }

    public async loadWorkspace(path: string, proj: string, id: string): Promise<void> {
        if (this.pipe_) {
            this.pipe_.sendRequest({
                request: 'loadWorkspace',
                data: {
                    path: path,
                    project: proj,
                    example: id
                }
            });
        }
    }

    private setupHandlers() {
        this.registerHandler('browseForFolderResult', this.browseForFolderResult.bind(this));
        this.registerHandler('browseForFileResult', this.browseForFileResult.bind(this));
        this.registerHandler('createProjectProgress', this.processProgress.bind(this));
        this.registerHandler('appStatus', this.processAppStatus.bind(this));
        this.registerHandler('recentlyOpened', (cmd) => { this.recentlyOpened.next(cmd.data || [])});
        this.registerHandler('selectTab', (cmd) => { this.navTab.next(cmd.data || [])});
        this.registerHandler('loadedAsset', (cmd) => { this.loadedAsset.next(cmd.data || '')});
        this.registerHandler('devKitStatus', (cmd) => { this.devKitStatus.next(cmd.data)}) ;
        this.registerHandler('sendAllBSPs', (cmd) => { this.allBSPs.next(cmd.data || [])}) ;
        this.registerHandler('sendActiveBSPs', (cmd) => { this.activeBSPs.next(cmd.data || [])}) ;
        this.registerHandler('sendAllBSPsExceptEAP', (cmd) => { this.allBSPExceptEAPData = cmd.data || []; this.allBSPsExceptEAP.next(cmd.data || [])}) ;
        this.registerHandler('mtbMode', (cmd) => { this.mtbMode.next(cmd.data || 'none')}) ;
        this.registerHandler('setupTab', (cmd) => { this.setupTab.next(cmd.data || 0)}) ;
        this.registerHandler('neededTools', (cmd) => { this.neededTools.next(cmd.data)}) ;
        this.registerHandler('installProgress', (cmd) => { this.installProgress.next(cmd.data)}) ;
        this.registerHandler('glossaryEntries', (cmd) => { this.glossaryEntries.next(cmd.data)}) ;
        this.registerHandler('setIntellisenseProject', (cmd) => { this.intellisenseProject.next(cmd.data)}) ;
        this.registerHandler('setTheme', (cmd) => { this.theme.next(cmd.data || 'dark')}) ;
        this.registerHandler('settings', (cmd) => { this.settings.next(cmd.data)}) ;
        this.registerHandler('manifestStatus', this.handleManifestStatus.bind(this));
        this.registerHandler('lcsBspsIn', this.processLcsBSPsIn.bind(this)) ;
        this.registerHandler('lcsNeedsUpdate', (cmd) => { this.lcsBusy.next(false) ; this.lcsNeedsUpdate.next(cmd.data || false) });
        this.registerHandler('lcsNeedsApply', (cmd) => { this.lcsBusy.next(false) ; this.lcsNeedsApply.next(cmd.data || false)});
        this.registerHandler('lcsToAdd', (cmd) => { this.lcsToAdd.next(cmd.data || [])});
        this.registerHandler('lcsToDelete', (cmd) => { this.lcsToDelete.next(cmd.data || [])}) ;
        this.registerHandler('sendCodeExamples', (cmd) => { this.codeExample.next(cmd.data || [])}) ;
        this.registerHandler('sendDefaultProjectDir', (cmd) => { this.defaultProjectDir.next(cmd.data || '')}) ;
        this.registerHandler('showSettingsError', (cmd) => { this.settingsErrors.next(cmd.data) ; }) ;
        this.registerHandler('setChooseMTBLocationStatus', this.handleMTBLocationStatus.bind(this));
        this.registerHandler('apikey', this.handleAPIKey.bind(this));
        this.registerHandler('ready', this.handleReadyMessage.bind(this));
        this.registerHandler('error', this.handleErrorMessage.bind(this));
        this.registerHandler('justNeedTools', (cmd) => { this.justNeedTools.next(cmd.data || false) });
    }

    private handleManifestStatus(cmd: BackEndToFrontEndResponse) {
            if (cmd.data === true) {
                this.manifestStatus.next('loaded');
            } else if (cmd.data === false) {
                this.manifestStatus.next('loading');
            } else if (typeof cmd.data === 'string' && (cmd.data === 'loading' || cmd.data === 'loaded' || cmd.data === 'not-available')) {
                this.manifestStatus.next(cmd.data);
            } else {
                this.manifestStatus.next('not-available');
            }
    }

    private handleReadyMessage(cmd: BackEndToFrontEndResponse) {
        this.ready_ = true;
        this.ready.next(this.ready_);
        if (cmd.data && typeof cmd.data === 'string') {
            let theme = cmd.data as string ;
            if (theme === 'dark' || theme === 'light') {
                this.theme.next(theme);
            }
        }
    }

    private handleErrorMessage(cmd: BackEndToFrontEndResponse) {
        this.errorMessage.next(cmd.data);
        this.mtbMode.next('error') ;
    }

    private handleAPIKey(cmd: BackEndToFrontEndResponse) {
        this.log(`API key received: ${JSON.stringify(cmd.data)}`);
        this.aiApiKey.next(cmd.data) ;
    }   

    private handleMTBLocationStatus(cmd: BackEndToFrontEndResponse) {
        this.homeError.next(cmd.data.homeError) ;
        this.homeWarning.next(cmd.data.homeWarning) ;
        this.customError.next(cmd.data.customError) ;
        this.customWarning.next(cmd.data.customWarning) ;
    }

    private sendPipeRequest(req: FrontEndToBackEndRequest) : void {
        if (this.pipe_ && this.ready_) {
            this.pipe_.sendRequest(req);
        }
    }

    public executeBuildAction(action: string, project?: string): void {
        this.sendPipeRequest({
            request: 'buildAction',
            data: {
                action: action,
                project: project
            }
        });
    }

    private browseForFolderResult(cmd: BackEndToFrontEndResponse) {
        this.browserFolder.next(cmd.data as BrowseResult | null);
    }

    private browseForFileResult(cmd: BackEndToFrontEndResponse) {
        this.browserFile.next(cmd.data as BrowseResult | null);
    }

    private processProgress(cmd: BackEndToFrontEndResponse) {
        if (cmd.data) {
            this.progressMessage.next(cmd.data.message || '');
            this.progressPercent.next(cmd.data.percent || 0);
        }
    }   

    private processAppStatus(cmd: BackEndToFrontEndResponse) {
        let appStatusData: ApplicationStatusData = cmd.data;
        let str = '' ;
        for(let proj of appStatusData.projects) {
            str += ' ' + proj.missingAssets ? 'true' : 'false';
        }
        this.appStatusData.next(appStatusData);        
    }

    private processLcsBSPsIn(cmd: BackEndToFrontEndResponse) {
        let inlist = cmd.data ? (cmd.data as string[]) : [] ;
        this.bspsIn.next(inlist) ;
        let outbsplist = this.allBSPExceptEAPData.map(bsp=> bsp.name ) ;
        let outbsps = outbsplist.filter(bsp => !inlist.includes(bsp)) ;
        this.bspsNotIn.next(outbsps) ;
        this.lcsBusy.next(false) ;
    }

    private messageProc(cmd: BackEndToFrontEndResponse) {
        let maxstr = 128 ;
        let str = JSON.stringify(cmd) ;
        if (str.length > maxstr) {
            str = str.substring(0, maxstr) + '...';
        }

        const handler = this.handlers_.get(cmd.response);
        if (!handler) {
            this.log(`No handler found for command: ${cmd.response}`, 'silly');
            return;
        }
        handler(cmd);
    }
    
    private isElectron(): boolean {
        return typeof window !== 'undefined' && window && window.feexpAPI && typeof window.feexpAPI.send === 'function';
    }

    private createPipe(): PipeInterface | undefined {
        let ret: PipeInterface | undefined = undefined;

        if (typeof acquireVsCodeApi === 'function') {
            ret = new VSCodePipe();
        }
        else if (this.isElectron()) {
            ret = new ElectronPipe();
        }
        else {
            ret = new BrowserPipe();
        }
        
        return ret ;
    }
}
