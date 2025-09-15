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

import { Injectable} from '@angular/core';
import { BehaviorSubject} from 'rxjs';
import { PipeInterface } from './pipes/pipeInterface';
import { ElectronPipe } from './pipes/electronPipe';
import { VSCodePipe } from './pipes/vscodePipe';
import { BrowserPipe } from './pipes/browserPipe';
import { BackEndToFrontEndResponse, BSPIdentifier, FrontEndToBackEndRequest, ApplicationStatusData, BackEndToFrontEndType, DevKitInfo, RecentEntry, FrontEndToBackEndType, SetupProgram, InstallProgress, MTBAssistantMode, GlossaryEntry, MTBSetting, BrowseResult, CodeExampleIdentifier, SettingsError, ThemeType, ManifestStatusType, MemoryUsageData } from '../../comms';
import { ProjectManager } from './projectmgr';

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

    // Display related
    theme: BehaviorSubject<ThemeType> = new BehaviorSubject<ThemeType>('dark');
    navTab: BehaviorSubject<number> = new BehaviorSubject<number>(0) ;
    setupTab: BehaviorSubject<number> = new BehaviorSubject<number>(0) ;
    browserFolder: BehaviorSubject<BrowseResult | null> = new BehaviorSubject<BrowseResult | null>(null);
    browserFile: BehaviorSubject<BrowseResult | null> = new BehaviorSubject<BrowseResult | null>(null);

    // Application related
    appStatusData: BehaviorSubject<ApplicationStatusData | null> = new BehaviorSubject<ApplicationStatusData | null>(null);
    loadedAsset: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
    buildDone: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false) ;

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
    toolsLocError: BehaviorSubject<string | undefined> = new BehaviorSubject<string | undefined>(undefined);

    // Settings related
    settings: BehaviorSubject<MTBSetting[]> = new BehaviorSubject<MTBSetting[]>([]);
    settingsErrors: BehaviorSubject<SettingsError[]> = new BehaviorSubject<SettingsError[]>([]);

    // Extension state
    mtbMode: BehaviorSubject<MTBAssistantMode> = new BehaviorSubject<MTBAssistantMode>('initializing');    
    errorMessage: BehaviorSubject<string> = new BehaviorSubject<string>('Default Error Message');
    ready: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    // Misc
    glossaryEntries: BehaviorSubject<GlossaryEntry[]> = new BehaviorSubject<GlossaryEntry[]>([]);
    userGuide: BehaviorSubject<string> = new BehaviorSubject<string>('User Guide');
    intellisenseProject: BehaviorSubject<string> = new BehaviorSubject<string>('');
    recentlyOpened: BehaviorSubject<RecentEntry[]> = new BehaviorSubject<RecentEntry[]>([]);
    devKitStatus: BehaviorSubject<DevKitInfo[]> = new BehaviorSubject<DevKitInfo[]>([]);
    defaultProjectDir: BehaviorSubject<string> = new BehaviorSubject<string>('') ;
    os: BehaviorSubject<string> = new BehaviorSubject<string>('') ;
    isPasswordVisible: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false) ;
    llvmVersions: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
    isLLVMInstalling: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false) ;

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

    // Memory Usage related
    memoryUsage: BehaviorSubject<MemoryUsageData[]> = new BehaviorSubject<MemoryUsageData[]>([]);

    // Data members
    private allBSPExceptEAPData : BSPIdentifier[] = [] ;

    constructor() {
        this.pipe_ = this.createPipe() ;
        if (this.pipe_) {
            this.pipe_.registerResponseHandler(this.messageProc.bind(this));
            this.setupHandlers();
        }
        this.projectManager_ = new ProjectManager(this);
        this.sendRequestWithArgs('check-ready', null) ;
    }

    public registerHandler(cmd: BackEndToFrontEndType, handler: (cmd: BackEndToFrontEndResponse) => void): void {  
        if (this.handlers_.has(cmd)) {
            this.warning(`overriding existing handler for command: ${cmd}`) ;
        }
        this.handlers_.set(cmd, handler);
    }

    private log(message: string, type: string) {
        if (this.pipe_) {
            this.pipe_.sendRequest({
                request: 'logMessage',
                data: {
                    message: message,
                    type: type || 'debug'
                }
            });
        }
    }

    public debug(message: string) {
        this.log(message, 'debug');
    }

    public info(message: string) {
        this.log(message, 'info');
    }

    public error(message: string) {
        this.log(message, 'error');
    }

    public warning(message: string) {
        this.log(message, 'warning');
    }

    public fixMissingAssets(project: any): void { 
        if (this.pipe_) {
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

    public browseForFolder(tag: string, button: string): void{
        this.debug(`Requesting browser for folder, tag: ${tag}, button: ${button}`);
            if (this.pipe_) {
                this.pipe_.sendRequest({
                    request: 'browseForFolder',
                    data: {
                        tag: tag,
                        button: button
                    }
                });
            }
    }

    public browseForFile(tag: string): void{
        this.debug(`Requesting browser for file, tag: ${tag}`);
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
        this.registerHandler('tools-loc-error', this.handleToolsLocError.bind(this)) ;
        this.registerHandler('os', (cmd) => { this.os.next(cmd.data || '') });
        this.registerHandler('userguide', (cmd) => { this.userGuide.next(cmd.data || 'User Guide') });
        this.registerHandler('buildDone', (cmd) => { this.buildDone.next(cmd.data); } );
        this.registerHandler('getPassword', this.getPassword.bind(this));
        this.registerHandler('memoryUsage', (cmd) => { this.memoryUsage.next(cmd.data || []) });
        this.registerHandler('installLLVM', this.handleInstallLLVM.bind(this));
    }

    private handleInstallLLVM(cmd: BackEndToFrontEndResponse) {
        if (cmd.data) {
            this.isLLVMInstalling.next(cmd.data.enabled || false);
            this.llvmVersions.next(cmd.data.versions || []);
        }
    }

    private getPassword(cmd: BackEndToFrontEndResponse) {
        this.isPasswordVisible.next(cmd.data) ;
    }

    private handleToolsLocError(cmd: BackEndToFrontEndResponse) {
        this.debug(`Tools location error: ${JSON.stringify(cmd.data)}`);
        this.toolsLocError.next(cmd.data);
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
            this.error(`No handler found for command: ${cmd.response}`);
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
