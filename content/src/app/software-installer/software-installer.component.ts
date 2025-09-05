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

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { BackendService } from '../backend/backend-service';

import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import type { SetupProgram } from '../../comms';
import { Subscription } from 'rxjs/internal/Subscription';
export type InstallChoiceType = 'home' | 'custom';

@Component({
  selector: 'app-software-installer',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule],
  templateUrl: './software-installer.component.html',
  styleUrls: ['./software-installer.component.scss']
})

export class SoftwareInstallerComponent implements OnInit, OnDestroy {
  activeInstallSet: Set<string> = new Set();
  private static readonly urlStr = 'https://www.infineon.com/';

  step = 0; // Backend-driven steps (location, confirm tools, complete) after account verification
  // Account verification (pre-step) state
  hasChosenLocation = false;
  installChoice: InstallChoiceType | null = null;
  customPath: string = '';
  homeError?: string;
  homeWarning?: string;
  customError?: string;
  customWarning?: string;
  loadingTools = false;
  downloading: boolean = false;
  disableNext: boolean = false ;
  justNeedTools: boolean = false ;
  os: string = '' ;
  toolsLocError: string | undefined = undefined ;
  neededTools: SetupProgram[] = [];
  installSelections: { [featureId: string]: boolean } = {};
  upgradeSelections: { [featureId: string]: boolean } = {};
  progress: { [featureId: string]: { message?: string, percent?: number } } = {};

  private subscriptions: Subscription[] = [] ;

  public be: BackendService;
  constructor(be: BackendService, private cdr: ChangeDetectorRef) {
    this.be = be;
  }

  ngOnInit() : void {
    this.subscriptions.push(this.be.neededTools.subscribe(tools => {
      this.neededTools = tools || [];

      this.installSelections = {};
      this.upgradeSelections = {};
      this.progress = {};
      for (let tool of this.neededTools) {
        if (!tool.installed && !tool.required) {
          this.installSelections[tool.featureId] = false;
        }
        if (tool.installed && tool.upgradable) {
          this.upgradeSelections[tool.featureId] = false;
        }
        this.progress[tool.featureId] = { message: '', percent: 0 };
      }
      this.disableNext = false ;
      this.cdr.detectChanges();
    }));

    this.subscriptions.push(this.be.os.subscribe(os => {
      this.be.log(`OS type sent to frontend: ${os}`); 
      this.os = os;
      this.cdr.detectChanges();

      if (os === 'darwin') {
        this.customPath = '/Applications' ;
      } else if (os === 'win32') {
        this.customPath = 'C:\\ModusToolbox' ;
      } else {
        this.customPath = '/opt' ;
      }
    }));

    this.subscriptions.push(this.be.homeError.subscribe(err => {
      this.homeError = err;
      this.cdr.detectChanges();
    }));

    this.subscriptions.push(this.be.homeWarning.subscribe(warn => {
      this.homeWarning = warn;
      this.cdr.detectChanges();
    }));

    this.subscriptions.push(this.be.customError.subscribe(err => {
      this.customError = err;
      this.cdr.detectChanges();
    }));

    this.subscriptions.push(this.be.customWarning.subscribe(warn => {
      this.customWarning = warn;
      this.cdr.detectChanges();
    }));

    this.subscriptions.push(this.be.setupTab.subscribe(index => {
      this.step = index;
      this.cdr.detectChanges();
    }));

    this.subscriptions.push(this.be.installProgress.subscribe(progress => {
      if (progress) {
        this.onReportProgress(progress.featureId, progress.message, progress.percent);
      }
    }));

    this.subscriptions.push(this.be.browserFolder.subscribe(reply => {
      if (reply && reply.tag === 'customToolInstall') {
        this.customPath = reply.path;
        this.cdr.detectChanges();
      }
    }));

    this.subscriptions.push(this.be.justNeedTools.subscribe(justNeed => {
      this.justNeedTools = justNeed;
      this.cdr.detectChanges();
    }));

    this.subscriptions.push(this.be.toolsLocError.subscribe(err => {
      this.toolsLocError = err;
      this.cdr.detectChanges();
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onNoAccountClick() {
    this.be.sendRequestWithArgs('open', { location: SoftwareInstallerComponent.urlStr} );
  }

  onHasAccountClick() {
    this.loadingTools = true;
    this.hasChosenLocation = true;
    this.be.sendRequestWithArgs('hasAccount', null) ;
  }

  // Location selection methods
  selectInstallChoice(choice: InstallChoiceType) {
    if ((choice === 'home' && this.homeError) || (choice === 'custom' && this.customError)) { 
      return; 
    }
    this.installChoice = choice;
  }

  onCustomPathInput(value: string) { 
    this.customPath = value; 
    this.be.sendRequestWithArgs('checkInstallPath', value) ;
  }

  browseForCustom() {
    if (this.customError) { return; }
    // Automatically select the custom path card when browse is clicked
    this.installChoice = 'custom';
    this.be.browseForFolder('customToolInstall');
  }

  locationNext() {
    if (!this.installChoice) { return; }
    const payload: any = { type: this.installChoice };
    if (this.installChoice === 'custom') { payload.path = this.customPath; }
    this.be.sendRequestWithArgs('initSetup', payload);
    this.disableNext = true ;
    this.step = 1;
  }

  onConfirmTools() {
    // Collect tools to install/upgrade
    const selected: SetupProgram[] = [];
    this.activeInstallSet.clear();
    for (const tool of this.neededTools) {
      if ((!tool.installed && tool.required) ||
          (tool.installed && tool.upgradable && this.upgradeSelections[tool.featureId]) ||
          (!tool.installed && !tool.required && this.installSelections[tool.featureId])) {
        selected.push(tool);
        this.activeInstallSet.add(tool.featureId);
      }
    }
    // Call the callback if set
    if (this.onInstallTools) {
      this.onInstallTools(selected);
    }
    // Show downloading message and spinner
    this.downloading = true;
    for (const tool of selected) {
      this.progress[tool.featureId].message = 'Installing...';
      this.progress[tool.featureId].percent = 0;
    }
  }

  isCustomInstallAvailable(): boolean {
    return this.os !== 'darwin';
  }

  onInstallTools(tools: SetupProgram[]) {
    this.be.sendRequestWithArgs('installTools', tools);
  }

  onReinit() {
    this.be.sendRequestWithArgs('restartExtension', null);    
  }

  onReportProgress(featureId: string, message: string, percent: number) {
    this.progress[featureId].message = message;
    this.progress[featureId].percent = percent;
    this.cdr.detectChanges();
  }
}
