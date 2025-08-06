import { Injectable, Pipe } from '@angular/core';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { PipeInterface } from './pipes/pipeInterface';
import { ElectronPipe } from './pipes/electronPipe';
import { VSCodePipe } from './pipes/vscodePipe';
import { BrowserPipe } from './pipes/browserPipe';
import { BackEndToFrontEndResponse, DevKitData, BSPIdentifier, FrontEndToBackEndRequest, MemoryStats, MemoryUsage } from '../../comms';
import { ManifestManager } from './manifestmgr';
import { ProjectManager } from './projectmgr';

declare var acquireVsCodeApi: any | undefined ;

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private pipe_?: PipeInterface ;
  private isDarkTheme_ : boolean = true ;
  private manifestManager_: ManifestManager;
  private projectManager_ : ProjectManager ;

  navTab: Subject<number> = new Subject<number>() ;
  browserFolder: Subject<string | null> = new Subject<string | null>();
  memoryStats = new BehaviorSubject<MemoryStats | null>(null);  

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

    this.sendRequest({
      request: 'setPlatform',
      data: {
        platform: this.pipe_ ? this.pipe_.platform : 'unknown'
      }}) ;
  }

  public get manifestMgr(): ManifestManager {
    return this.manifestManager_;
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

  private fetchMemoryStats(): Observable<MemoryStats> {
    // Mock data - replace with actual API calls
    const mockMemoryData: MemoryUsage[] = [
      { type: 'SRAM', used: 45600, total: 65536, percentage: 69.6, unit: 'bytes' },
      { type: 'RRAM', used: 128000, total: 262144, percentage: 48.8, unit: 'bytes' },
      { type: 'SOCMEM', used: 32768, total: 65536, percentage: 50.0, unit: 'bytes' },
      { type: 'DTCM', used: 16384, total: 32768, percentage: 50.0, unit: 'bytes' },
      { type: 'ITCM', used: 24576, total: 32768, percentage: 75.0, unit: 'bytes' },
      { type: 'XIP', used: 1048576, total: 2097152, percentage: 50.0, unit: 'bytes' }
    ];

    const totalUsed = mockMemoryData.reduce((sum, mem) => sum + mem.used, 0);
    const totalAvailable = mockMemoryData.reduce((sum, mem) => sum + mem.total, 0);

    const memoryStats: MemoryStats = {
      totalUsed,
      totalAvailable,
      memoryTypes: mockMemoryData,
      lastUpdated: new Date()
    };

    return of(memoryStats);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getUsageLevel(percentage: number): 'low' | 'medium' | 'high' | 'critical' {
    if (percentage < 50) return 'low';
    if (percentage < 75) return 'medium';
    if (percentage < 90) return 'high';
    return 'critical';
  }  

  private messageProc(cmd: BackEndToFrontEndResponse) {
    let str = JSON.stringify(cmd) ;
    if (str.length > 128) {
      str = str.substring(0, 128) + '...';
    }
    this.log(`Received response from backend: ${str}`) ;

    if (cmd.response === 'setDevKits') {
      this.manifestManager_.processDevKits(cmd);
    }
    else if (cmd.response === 'setCodeExamples') {
      this.manifestManager_.processCodeExamples(cmd);
    }
    else if (cmd.response === 'createProjectResult') {
      this.projectManager_.createProjectResponse(cmd);
    }
    else if (cmd.response === 'success') {
      this.log(`Command succeeded: ${cmd.data}`);
    }
    else if (cmd.response === 'error') {
      this.log(`Command failed: ${cmd.data}`);
    }
    else if (cmd.response === 'browseForFolderResult') {
      this.browserFolder.next(cmd.data as string | null);
    }
    else if (cmd.response === 'oob') {
      if (cmd.data.oobtype && cmd.data.oobtype === 'progress') {
        this.progressMessage.next(cmd.data.message || '');
        this.progressPercent.next(cmd.data.percent || 0);
      }
    }
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
