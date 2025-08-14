import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'app-software-installer',
  templateUrl: './software-installer.component.html',
  styleUrls: ['./software-installer.component.scss']
})

export class SoftwareInstallerComponent implements OnInit, OnDestroy {
  private static readonly urlStr = 'https://sso.infineon.com/as/authorization.oauth2?scope=email+openid+profile+address+ifxScope&response_type=code&redirect_uri=https%3A%2F%2Fwww.infineon.com%2Fauth%2Fcallback&state=7SM9NWvQ-Hg13oLWcPKKmIx2Y7GFPP61Pi5j1bTyDN8%3AoriginURL%3D%2F%26action%3Drg_rg%26ui_locales%3Den&code_challenge_method=S256&nonce=6kSDF5Kqqrew-Ltti4MEAroH3NHmSmtxtbVJeD5DK8I&client_id=ifxWebUser&code_challenge=i-ENApZ5PQDsBz0buurl7zEmcX3DkbOuJ1qnmOGkrCg&ui_locales=EN&pf.registration=true&cancel.identifier.selection=true'
  step = 0;
  loadingTools = false;

  constructor(private be: BackendService, private cdr: ChangeDetectorRef) {
    this.be.setupTab.subscribe(index => {
      this.step = index + 1;
      this.cdr.detectChanges();
    }) ;
  }

  ngOnInit() : void {
  }

  ngOnDestroy(): void {
  }

  onNoAccountClick() {
    this.be.platformSpecific('open', { location: SoftwareInstallerComponent.urlStr} );
  }

  onHasAccountClick() {
    this.loadingTools = true;
    this.be.platformSpecific('initSetup', null);
  }

  onConfirmTools() {
  }

  onReinit() {
  }
}
