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

import { Component, ViewChild } from '@angular/core';
import { SoftwareInstallerComponent } from './software-installer/software-installer.component';
import { MtbNav, MtbNavTab } from './mtb-nav/mtb-nav';
import { BackendService } from './backend/backend-service';
import { MTBAssistantMode, ThemeType } from '../comms';
import { IdcLauncherRequiredComponent } from "./idc-launcher-required/idc-launcher-required.component";
import { InitializingComponent } from "./initializing/initializing.component";
import { ErrorComponent } from "./error/error.component";
import { PasswordOverlayComponent } from './password-overlay/password-overlay.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [MtbNav, SoftwareInstallerComponent, IdcLauncherRequiredComponent, InitializingComponent, ErrorComponent, PasswordOverlayComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})

export class App {
  public mtbMode : MTBAssistantMode = 'initializing';

  @ViewChild('topMtbNav') topMtbNav!: MtbNav;
  @ViewChild('softwareInstaller') softwareInstaller!: SoftwareInstallerComponent;

  isPasswordVisible: boolean = false;
  theme: ThemeType = 'dark';

  subscriptions: Subscription[] = [];

  constructor(private be: BackendService) {
    this.subscriptions.push(this.be.navTab.subscribe(index => {
      this.topMtbNav.selectedIndex = index;
    }));

    this.subscriptions.push(this.be.isPasswordVisible.subscribe(visible => {
      this.isPasswordVisible = visible;
    }));

    this.subscriptions.push(this.be.mtbMode.subscribe(mode => {
      this.be.log(`App component updated - ${mode}`);
      this.mtbMode = mode;
    }));

    this.subscriptions.push(this.be.setupTab.subscribe(index => {
      this.softwareInstaller.step = index;
    }));

    this.subscriptions.push(this.be.theme.subscribe(theme => {
      this.theme = theme ;
    }));

    this.be.log(`App component initialized - ${this.mtbMode}`);
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
      label: 'Glossary',
      component: 'GlossaryComponent',
      icon: 'help'
    },
    {
      label: "User's Guide",
      component: 'UsersGuideComponent',
      icon: 'menu_book'
    },
    // {
    //   label: 'AI',
    //   component: 'AIViewComponent',
    //   icon: 'smart_toy'
    // }
  ];
}
