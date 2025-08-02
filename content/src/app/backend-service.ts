import { Injectable, Pipe } from '@angular/core';
import { Subject } from 'rxjs';
import { PipeInterface } from './pipes/pipeInterface';
import { ElectronPipe } from './pipes/electronPipe';
import { VSCodePipe } from './pipes/vscodePipe';
import { BrowserPipe } from './pipes/browserPipe';
import { BackEndToFrontEndResponse, DevKitData, DevKitIdentifier } from '../comms';

type backendType = 'vscode' | 'electron';


declare var acquireVsCodeApi: any | undefined ;

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private pipe_?: PipeInterface ;

  devkits : Subject<DevKitIdentifier[]> = new Subject<DevKitIdentifier[]>();
  devkitCategories : Subject<string[]> = new Subject<string[]>();

  constructor() {
    this.pipe_ = this.createPipe() ;
    if (this.pipe_) {
      this.pipe_.registerResponseHandler(this.messageProc.bind(this));
      this.log(`BackendService initialized with ${this.pipe_.displayName} pipe.`);
    }
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

  public refreshBSPs() {
    this.log('Refreshing BSPs') ;

    if (this.pipe_) {
      this.pipe_.sendRequest({
        request: 'getDevKits',
        data: null
      });
    }
  }

  public async openDirectoryPicker(): Promise<string | null> {
    return new Promise((resolve) => {
      this.log('Opening directory picker');
      
      if (this.pipe_) {
        // Store the original handler
        const originalHandler = this.messageProc.bind(this);
        
        // Create a temporary response handler for directory picker
        const tempHandler = (response: BackEndToFrontEndResponse) => {
          if (response.response === 'directorySelected') {
            // Restore original handler
            this.pipe_!.registerResponseHandler(originalHandler);
            resolve(response.data as string);
            return;
          } else if (response.response === 'directoryPickerCancelled') {
            // Restore original handler
            this.pipe_!.registerResponseHandler(originalHandler);
            resolve(null);
            return;
          }
          // For other responses, pass to original handler
          originalHandler(response);
        };
        
        // Set the temporary handler
        this.pipe_.registerResponseHandler(tempHandler);
        
        // Send the request
        this.pipe_.sendRequest({
          request: 'openDirectoryPicker',
          data: null
        });
        
        // Fallback timeout to restore handler if no response
        setTimeout(() => {
          this.pipe_!.registerResponseHandler(originalHandler);
          resolve(null);
        }, 10000); // 10 second timeout
      } else {
        // Fallback for browser mode - simulate directory selection
        this.log('Browser mode: simulating directory selection');
        setTimeout(() => {
          const mockPaths = [
            'C:\\Users\\Developer\\Documents\\ModusToolbox',
            'C:\\workspace\\embedded-projects',
            'D:\\development\\modustoolbox-apps',
            'C:\\Users\\john\\Projects\\MTB'
          ];
          const mockPath = mockPaths[Math.floor(Math.random() * mockPaths.length)];
          resolve(mockPath);
        }, 500);
      }
    });
  }

  private messageProc(cmd: BackEndToFrontEndResponse) {
    this.log(`Received command: ${cmd.response}`) ;
    if (cmd.response === 'setDevKits') {
      let devkits: DevKitIdentifier[] = (cmd.data! as DevKitData).kits as DevKitIdentifier[] ;
      this.devkits.next(devkits);
      let categories = [...new Set(devkits.map(kit => kit.category))];
      this.devkitCategories.next(categories);
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
