import { Component, Input, ViewChild } from '@angular/core';
import { SoftwareInstallerComponent } from './software-installer/software-installer.component';
import { MtbNav, MtbNavTab } from './mtb-nav/mtb-nav';
import { BackendService } from './backend/backend-service';
import { MTBAssistantMode } from '../comms';
import { IdcLauncherRequiredComponent } from "./idc-launcher-required/idc-launcher-required.component";
import { InitializingComponent } from "./initializing/initializing.component";
import { ErrorComponent } from "./error/error.component";

@Component({
  selector: 'app-root',
  imports: [MtbNav, SoftwareInstallerComponent, IdcLauncherRequiredComponent, InitializingComponent, ErrorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})

export class App {
  public mtbMode : MTBAssistantMode = 'initializing';

  @Input() dmesg : string = 'Debug Message Placeholder' ;
  @ViewChild('topMtbNav') topMtbNav!: MtbNav;
  @ViewChild('softwareInstaller') softwareInstaller!: SoftwareInstallerComponent;

  constructor(private be: BackendService) {
    this.be.setAppComponent(this) ;

    // Subscribe to navigation tab changes
    this.be.navTab.subscribe(index => {
      this.topMtbNav.selectedIndex = index;
    });

    this.be.mtbMode.subscribe(isInstalled => {
      this.mtbMode = isInstalled;
    });

    this.be.setupTab.subscribe(index => {
      this.softwareInstaller.step = index;
    });
  }

  // Define the tabs for the navigation
  navigationTabs: MtbNavTab[] = [
    {
      label: 'Getting Started',
      component: 'GettingStarted',
      icon: 'home'
    },
    {
      label: 'New Project',
      component: 'CreateProject',
      icon: 'add_circle'
    },
    {
      label: 'Recent',
      component: 'RecentlyOpenedComponent',
      icon: 'history'
    },
    {
      label: 'Application',
      component: 'ApplicationStatus',
      icon: 'dashboard'
    },
    {
      label: 'Dev Kits',
      component: 'DevkitListComponent',
      icon: 'dashboard'
    },
    {
      label: 'LCS',
      component: 'LocalContentStorageComponent',
      icon: 'storage'
    },
    {
      label: 'Settings',
      component: 'SettingsEditor',
      icon: 'settings'
    },
    {
      label: 'AI',
      component: 'AIViewComponent',
      icon: 'smart_toy'
    },    
    {
      label: 'Glossary',
      component: 'GlossaryComponent',
      icon: 'help'
    }
  ];
}
