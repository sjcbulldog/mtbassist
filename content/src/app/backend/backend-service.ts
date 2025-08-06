import { Injectable, Pipe } from '@angular/core';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { PipeInterface } from './pipes/pipeInterface';
import { ElectronPipe } from './pipes/electronPipe';
import { VSCodePipe } from './pipes/vscodePipe';
import { BrowserPipe } from './pipes/browserPipe';
import { BackEndToFrontEndResponse, DevKitData, BSPIdentifier, FrontEndToBackEndRequest, MemoryStats, MemoryUsage, ApplicationStatusData, BackEndToFrontEndResponseType } from '../../comms';
import { ManifestManager } from './manifestmgr';
import { ProjectManager } from './projectmgr';
import { AppStatusBackend } from './appmgrbe';

declare var acquireVsCodeApi: any | undefined ;

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private pipe_?: PipeInterface ;
  private isDarkTheme_ : boolean = true ;
  private manifestManager_: ManifestManager;
  private projectManager_ : ProjectManager ;
  private appStatusManager_ : AppStatusBackend;

  private handlers_ : Map<string, (cmd: BackEndToFrontEndResponse) => void> = new Map<string, (cmd: BackEndToFrontEndResponse) => void>();

  navTab: Subject<number> = new Subject<number>() ;
  browserFolder: Subject<string | null> = new Subject<string | null>();
  memoryStats = new BehaviorSubject<MemoryStats | null>(null);  
  appStatusData: BehaviorSubject<ApplicationStatusData | null> = new BehaviorSubject<ApplicationStatusData | null>(null);

  progressMessage: Subject<string> = new Subject<string>();
  progressPercent: Subject<number> = new Subject<number>();

  constructor() {
    this.pipe_ = this.createPipe() ;
    if (this.pipe_) {
      this.pipe_.registerResponseHandler(this.messageProc.bind(this));
      this.log(`BackendService initialized with ${this.pipe_.displayName} pipe.`);
    }

    this.manifestManager_ = new ManifestManager(this);
    this.projectManager_ = new ProjectManager(this);
    this.appStatusManager_ = new AppStatusBackend(this);

    this.sendRequest({
      request: 'setPlatform',
      data: {
        platform: this.pipe_ ? this.pipe_.platform : 'unknown'
      }}) ;
  }

  public registerHandler(cmd: BackEndToFrontEndResponseType, handler: (cmd: BackEndToFrontEndResponse) => void): void {  
    if (this.handlers_.has(cmd)) {
      this.log(`Warning: Overriding existing handler for command: ${cmd}`) ;
    }
    this.handlers_.set(cmd, handler);
  }

  public get manifestMgr(): ManifestManager {
    return this.manifestManager_;
  }

  public get appStatusMgr() : AppStatusBackend {
    return new AppStatusBackend(this);
  }

  public get isDarkTheme(): boolean {
    return this.isDarkTheme_;
  }

  public log(message: string) {
    console.log(`BackendService: ${message}`);
    if (this.pipe_) {
      this.pipe_.sendRequest({
        request: 'logMessage',
        data: message
      });
    }
  }

  public sendRequest(request: FrontEndToBackEndRequest) : void {
    if (this.pipe_) {
      this.pipe_.sendRequest(request);
    }
  }

  public platformSpecific(cmd: string, data: any) {
    if (this.pipe_) {
      this.pipe_!.sendRequest({
        request: 'platformSpecific',
        data: {
          command: cmd,
          data: data
        }
      });
    }
  }

  public setNavTab(index: number) {
    this.log(`Setting navigation tab to index: ${index}`);
    this.navTab.next(index);
  }

  public browseForFolder(): void{
    this.log('Requesting browser for folder');
      if (this.pipe_) {
        this.pipe_.sendRequest({
          request: 'platformSpecific',
          data: {
            command: 'browseForFolder'
          }
        });
      }
  }

  public async createProject(projectData: any): Promise<boolean> {
    return this.projectManager_.createProject(projectData);
  }

  public async loadWorkspace(path: string, proj: string): Promise<void> {
    if (this.pipe_) {
      this.pipe_.sendRequest({
        request: 'loadWorkspace',
        data: {
          path: path,
          project: proj
        }
      });
    }
  }

  private setupHandlers() {
    this.registerHandler('browseForFolderResult', this.browseForFolderResult.bind(this));
    this.registerHandler('oob', this.oobResult.bind(this));
  }

  private browseForFolderResult(cmd: BackEndToFrontEndResponse) {
      this.browserFolder.next(cmd.data as string | null);
  }

  private oobResult(cmd: BackEndToFrontEndResponse) {
      if (cmd.data.oobtype && cmd.data.oobtype === 'progress') {
        this.progressMessage.next(cmd.data.message || '');
        this.progressPercent.next(cmd.data.percent || 0);
      }
  }

  private messageProc(cmd: BackEndToFrontEndResponse) {
    let str = JSON.stringify(cmd) ;
    if (str.length > 128) {
      str = str.substring(0, 128) + '...';
    }
    this.log(`Received response from backend: ${str}`) ;

    const handler = this.handlers_.get(cmd.response);
    if (!handler) {
      this.log(`No handler found for command: ${cmd.response}`);
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
