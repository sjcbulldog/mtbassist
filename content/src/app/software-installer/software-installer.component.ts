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
  private static readonly urlStr = 'https://sso.infineon.com/as/authorization.oauth2?scope=email+openid+profile+address+ifxScope&response_type=code&redirect_uri=https%3A%2F%2Fwww.infineon.com%2Fauth%2Fcallback&state=7SM9NWvQ-Hg13oLWcPKKmIx2Y7GFPP61Pi5j1bTyDN8%3AoriginURL%3D%2F%26action%3Drg_rg%26ui_locales%3Den&code_challenge_method=S256&nonce=6kSDF5Kqqrew-Ltti4MEAroH3NHmSmtxtbVJeD5DK8I&client_id=ifxWebUser&code_challenge=i-ENApZ5PQDsBz0buurl7zEmcX3DkbOuJ1qnmOGkrCg&ui_locales=EN&pf.registration=true&cancel.identifier.selection=true'
  step = 0;
  loadingTools = false;
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
  }

  ngOnInit() : void {
    this.neededToolsSub = this.be.neededTools.subscribe(tools => {
      this.be.log('RECEIVED NEEDED TOOLS MESSAGE') ;

      this.neededTools = tools || [];

      this.installSelections = {};
      this.upgradeSelections = {};
      this.progress = {};
      this.be.log('STARTING LOOPING') ;
      this.be.log(`Needed tools: ${JSON.stringify(this.neededTools)}`) ;      
      for (let tool of this.neededTools) {
        this.be.log('    IN LOOP') ;
        this.be.log(`    LOOPING TOOL: ${JSON.stringify(tool)}`);
        if (!tool.installed && !tool.required) {
          this.installSelections[tool.featureId] = false;
        }
        if (tool.installed && tool.upgradable) {
          this.upgradeSelections[tool.featureId] = false;
        }
        this.progress[tool.featureId] = { message: '', percent: 0 };
      }
      this.be.log('LOOPING DONE') ;
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
    // Start install/upgrade for selected tools
    for (const tool of this.neededTools) {
      if ((!tool.installed && tool.required) || (tool.installed && tool.upgradable && this.upgradeSelections[tool.featureId]) || (!tool.installed && !tool.required && this.installSelections[tool.featureId])) {
        this.progress[tool.featureId].message = 'Installing...';
        this.progress[tool.featureId].percent = 0;
        // Simulate progress
        this.simulateInstall(tool.featureId);
      }
    }
  }

  simulateInstall(featureId: string) {
    let percent = 0;
    const interval = setInterval(() => {
      percent += 10;
      this.progress[featureId].percent = percent;
      this.progress[featureId].message = percent < 100 ? 'Installing...' : 'Installed!';
      this.cdr.detectChanges();
      if (percent >= 100) {
        clearInterval(interval);
      }
    }, 200);
  }

  onReinit() {
  }
}
