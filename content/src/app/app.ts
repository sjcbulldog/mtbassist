import { Component, ViewChild } from '@angular/core';
import { MtbNav, MtbNavTab } from './mtb-nav/mtb-nav';
import { Subject } from 'rxjs';
import { BackendService } from './backend/backend-service';

@Component({
  selector: 'app-root',
  imports: [MtbNav],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  @ViewChild('topMtbNav') topMtbNav!: MtbNav;

  constructor(private be: BackendService) {
    // Subscribe to navigation tab changes
    this.be.navTab.subscribe(index => {
      this.topMtbNav.selectedIndex = index;
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
      label: 'Create New Project',
      component: 'CreateProject',
      icon: 'add_circle'
    }
  ];
}
