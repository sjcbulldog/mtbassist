import { Injectable, Pipe } from '@angular/core';
import { Subject } from 'rxjs';
import { PipeInterface } from './pipes/pipeInterface';
import { ElectronPipe } from './pipes/electronPipe';
import { VSCodePipe } from './pipes/vscodePipe';
import { BrowserPipe } from './pipes/browserPipe';
import { BackEndToFrontEndResponse, DevKitData, BSPIdentifier } from '../comms';

declare var acquireVsCodeApi: any | undefined ;

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private pipe_?: PipeInterface ;
  private bspResolvers : (() => void)[] = [] ;

  bsps : Subject<BSPIdentifier[]> = new Subject<BSPIdentifier[]>();
  bspCategories : Subject<string[]> = new Subject<string[]>();
  navTab: Subject<number> = new Subject<number>() ;
  browserFolder: Subject<string | null> = new Subject<string | null>();

  constructor() {
    this.pipe_ = this.createPipe() ;
    if (this.pipe_) {
      this.pipe_.registerResponseHandler(this.messageProc.bind(this));
      this.log(`BackendService initialized with ${this.pipe_.displayName} pipe.`);
    }

    this.refreshBSPs(); // Initial load of BSPs
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

  public refreshBSPs() : Promise<void> {
    let ret = new Promise<void>((resolve, reject) => {
      this.log('Refreshing BSPs') ;

      if (this.pipe_) {
        this.pipe_.sendRequest({
          request: 'getDevKits',
          data: null
        });
      }
    }) ;
    return ret ;
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

  public async getBSPCategories(): Promise<string[]> {
    return new Promise((resolve) => {
      // First try to get from existing data
      this.bspCategories.subscribe(categories => {
        if (categories.length > 0) {
          this.log(`Returning cached categories: ${categories.join(', ')}`);
          resolve(categories);
          return;
        }
      });
      
      // If no categories available, refresh BSPs
      this.refreshBSPs()
        .then(() => {
          this.bspCategories.subscribe(categories => {
            if (categories.length > 0) {
              this.log(`Returning refreshed categories: ${categories.join(', ')}`);
              resolve(categories);
            } else {
              this.log('No categories found after refresh');
              resolve([]);
            }
          });
        })
        .catch(error => {
          console.error('Error refreshing BSPs:', error);
          resolve([]);
        });
    });
  }

  public async getBSPsForCategory(category: string): Promise<BSPIdentifier[]> {
    return new Promise((resolve) => {
      this.bsps.subscribe(devkits => {
        const filtered = devkits.filter(kit => kit.category === category);
        if (filtered.length > 0) {
          this.log(`Returning cached BSPs for category ${category}: ${filtered.map(k => k.name).join(', ')}`);
          resolve(filtered);
          return;
        }
      });

      this.refreshBSPs()
        .then(() => {
          this.bsps.subscribe(devkits => {
            const filtered = devkits.filter(kit => kit.category === category);
            if (filtered.length > 0) {
              this.log(`Returning refreshed BSPs for category ${category}: ${filtered.map(k => k.name).join(', ')}`);
              resolve(filtered);
            } else {
              this.log(`No BSPs found for category ${category}`);
              resolve([]);
            }
          });
        })
        .catch(error => {
          console.error('Error refreshing BSPs:', error);
          resolve([]);
        });
    });
  }

  public async getExamplesForBSP(bspId: string): Promise<string[]> {
    return new Promise((resolve) => {
      this.log(`Getting examples for BSP: ${bspId}`);
      
      // Mock data for development
      setTimeout(() => {
        const mockExamples = [
          'Hello World',
          'LED Blink',
          'WiFi Scan',
          'BLE Heart Rate',
          'TCP Client',
          'CapSense Slider',
          'FreeRTOS Tasks',
          'Deep Sleep Demo'
        ];
        resolve(mockExamples);
      }, 500);
    });
  }

  public async createProject(projectData: any): Promise<boolean> {
    return new Promise((resolve) => {
      this.log(`Creating project: ${JSON.stringify(projectData)}`);
      
      if (this.pipe_) {
        this.pipe_.sendRequest({
          request: 'platformSpecific',
          data: {
            command: 'createProject',
            data: projectData
          }
        });
      }
    });
  }

  private messageProc(cmd: BackEndToFrontEndResponse) {
    let str = JSON.stringify(cmd) ;
    if (str.length > 128) {
      str = str.substring(0, 128) + '...';
    }
    this.log(`Received response from backend: ${str}`) ;

    if (cmd.response === 'setDevKits') {
      let devkits: BSPIdentifier[] = (cmd.data! as DevKitData).kits as BSPIdentifier[] ;
      this.bsps.next(devkits);
      let categories = [...new Set(devkits.map(kit => kit.category))];
      this.bspCategories.next(categories);
      for(let resolver of this.bspResolvers) {
        resolver();
      }
    }
    else if (cmd.response === 'browseForFolderResult') {
      this.browserFolder.next(cmd.data as string | null);
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
