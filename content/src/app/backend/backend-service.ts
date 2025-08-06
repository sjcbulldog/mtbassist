import { Injectable, Pipe } from '@angular/core';
import { Subject } from 'rxjs';
import { PipeInterface } from './pipes/pipeInterface';
import { ElectronPipe } from './pipes/electronPipe';
import { VSCodePipe } from './pipes/vscodePipe';
import { BrowserPipe } from './pipes/browserPipe';
import { BackEndToFrontEndResponse, DevKitData, BSPIdentifier, FrontEndToBackEndRequest } from '../../comms';
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

  public async getApplicationInfo(): Promise<any> {
    // For now, return mock data since the backend integration is not yet implemented
    // In a real implementation, this would communicate with the backend to get actual application info
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          documents: [
            { title: 'ModusToolbox User Guide', url: 'https://infineon.com/modustoolbox-guide' },
            { title: 'API Reference', url: 'https://infineon.com/api-docs' },
            { title: 'Getting Started Guide', url: 'https://infineon.com/getting-started' }
          ],
          tools: [
            { name: 'Device Configurator', id: 'device-config' },
            { name: 'CAPSENSE Tuner', id: 'capsense-tuner' },
            { name: 'Library Manager', id: 'lib-manager' },
            { name: 'Project Creator', id: 'project-creator' }
          ],
          memoryUsage: [
            { memtype: 'Flash', size: 2097152, used: 1234567 },
            { memtype: 'SRAM', size: 1048576, used: 445566 },
            { memtype: 'EEPROM', size: 32768, used: 12345 }
          ],
          projects: [
            {
              name: 'Sensor Hub Project',
              libraries: [
                { title: 'PSoC HAL', id: 'psoc-hal', version: '2.4.0' },
                { title: 'FreeRTOS', id: 'freertos', version: '10.4.6' },
                { title: 'CAPSENSE', id: 'capsense', version: '3.0.0' }
              ],
              documents: [
                { title: 'Project README', url: 'file:///project/README.md' },
                { title: 'Hardware Design', url: 'file:///project/hardware.pdf' }
              ],
              tools: [
                { name: 'CAPSENSE Tuner', id: 'capsense-tuner' },
                { name: 'Device Configurator', id: 'device-config' }
              ]
            },
            {
              name: 'Connectivity Module',
              libraries: [
                { title: 'WiFi Host Driver', id: 'wifi-hd', version: '2.1.0' },
                { title: 'LWIP', id: 'lwip', version: '2.1.3' },
                { title: 'MBEDTLS', id: 'mbedtls', version: '2.28.0' }
              ],
              documents: [
                { title: 'WiFi Configuration Guide', url: 'file:///project/wifi-config.md' },
                { title: 'Network Protocol Stack', url: 'file:///project/network.pdf' }
              ],
              tools: [
                { name: 'WiFi Configurator', id: 'wifi-config' },
                { name: 'Security Configurator', id: 'security-config' }
              ]
            },
            {
              name: 'Motor Control System',
              libraries: [
                { title: 'Motor Control Library', id: 'motor-ctrl', version: '1.5.2' },
                { title: 'ADC Library', id: 'adc-lib', version: '2.0.1' },
                { title: 'PWM Library', id: 'pwm-lib', version: '1.8.0' }
              ],
              documents: [
                { title: 'Motor Control Theory', url: 'file:///project/motor-theory.pdf' },
                { title: 'Calibration Guide', url: 'file:///project/calibration.md' }
              ],
              tools: [
                { name: 'Motor Tuner', id: 'motor-tuner' },
                { name: 'Oscilloscope', id: 'oscilloscope' }
              ]
            }
          ]
        });
      }, 800); // Simulate network delay
    });
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
