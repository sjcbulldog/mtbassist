import { Component, ViewChild } from '@angular/core';
import { SoftwareInstallerComponent } from './software-installer/software-installer.component';
import { MtbNav, MtbNavTab } from './mtb-nav/mtb-nav';
import { BackendService } from './backend/backend-service';

@Component({
  selector: 'app-root',
  imports: [MtbNav, SoftwareInstallerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})

export class App {
  public isModusInstalled_ : boolean = true ;
  @ViewChild('topMtbNav') topMtbNav!: MtbNav;
  @ViewChild('softwareInstaller') softwareInstaller!: SoftwareInstallerComponent;

  constructor(private be: BackendService) {
    // Subscribe to navigation tab changes
    this.be.navTab.subscribe(index => {
      this.topMtbNav.selectedIndex = index;
    });

    this.be.isMTBInstalled.subscribe(isInstalled => {
      this.isModusInstalled_ = isInstalled;
    });

    this.be.setupTab.subscribe(index => { 
      this.softwareInstaller.step = index ;
    }) ;
  }

  // Define the tabs for the navigation
  navigationTabs: MtbNavTab[] = [
    {
      label: 'Getting Started',
      component: 'GettingStarted',
      icon: 'home'
    },
    {
      label: 'Create New Project',
      component: 'CreateProject',
      icon: 'add_circle'
    },
    {
      label: 'Recently Opened',
      component: 'RecentlyOpenedComponent',
      icon: 'history'
    },
    {
      label: 'Application Status',
      component: 'ApplicationStatus',
      icon: 'dashboard'
    },
    {
      label: 'Attached Development Kits',
      component: 'DevkitListComponent',
      icon: 'dashboard'
    }    
  ];
}
