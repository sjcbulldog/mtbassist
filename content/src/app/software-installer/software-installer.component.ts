import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { BackendService } from '../backend/backend-service';

import { FormsModule } from '@angular/forms';
import type { SetupProgram } from '../../comms';

@Component({
  selector: 'app-software-installer',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './software-installer.component.html',
  styleUrls: ['./software-installer.component.scss']
})

export class SoftwareInstallerComponent implements OnInit, OnDestroy {
  activeInstallSet: Set<string> = new Set();
  private static readonly urlStr = 'https://www.infineon.com/';

  step = 0;
  loadingTools = false;
  downloading: boolean = false;
  neededTools: SetupProgram[] = [];
  installSelections: { [featureId: string]: boolean } = {};
  upgradeSelections: { [featureId: string]: boolean } = {};
  progress: { [featureId: string]: { message?: string, percent?: number } } = {};

  private neededToolsSub?: any;
  constructor(private be: BackendService, private cdr: ChangeDetectorRef) {
    this.be.setupTab.subscribe(index => {
      this.step = index;
      this.cdr.detectChanges();
    }) ;

    this.be.installProgress.subscribe(progress => {
      this.onReportProgress(progress.featureId, progress.message, progress.percent);
    });
  }

  ngOnInit() : void {
    this.neededToolsSub = this.be.neededTools.subscribe(tools => {
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
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.neededToolsSub) {
      this.neededToolsSub.unsubscribe();
    }
  }

  onNoAccountClick() {
    this.be.sendRequestWithArgs('open', { location: SoftwareInstallerComponent.urlStr} );
  }

  onHasAccountClick() {
    this.be.log('User has an account, initializing setup...');
    this.loadingTools = true;
    this.be.sendRequestWithArgs('initSetup', null);
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
