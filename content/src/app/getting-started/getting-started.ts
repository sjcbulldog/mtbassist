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
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { BackendService } from '../backend/backend-service';
import MtbNav from '../mtb-nav/mtb-nav';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-getting-started',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatListModule,
    MatDividerModule
  ],
  templateUrl: './getting-started.html',
  styleUrl: './getting-started.scss'
})
export class GettingStarted implements OnInit, OnDestroy {
  themeType: 'dark' | 'light' = 'dark'; // Default to light theme

  private themeSubscription?: Subscription;
  private readySubscription?: Subscription ;

  constructor(private be: BackendService, private cdr: ChangeDetectorRef) {

  }

  ngOnInit(): void {
    this.themeSubscription = this.be.theme.subscribe(theme => {
      this.themeType = theme;
    }) ;

    this.readySubscription = this.be.ready.subscribe(ready => {
      if (ready) {
      }
    });
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
    this.readySubscription?.unsubscribe();
  }

  goToCreateProject() {
    this.be.navTab?.next(1); // 1 = Create Project tab index
  }

  goToRecentlyOpened() {
    this.be.navTab?.next(2); // 2 = Recently Opened tab index (adjust if needed)
  }
  
  features = [
    {
      icon: 'speed',
      title: 'Quick Project Setup',
      description: 'Create new ModusToolbox projects with pre-configured templates and BSPs'
    },
    {
      icon: 'extension',
      title: 'Dev Kit Support',
      description: 'Support for various Infineon development kits and boards'
    },
    {
      icon: 'build',
      title: 'Build Integration',
      description: 'Seamless integration with VS Code build and debug workflows'
    },
    {
      icon: 'library_books',
      title: 'Code Examples',
      description: 'Access to extensive library of code examples and middleware'
    }
  ];

  quickStartSteps = [
    {
      step: 1,
      title: 'Create New Application',
      description: 'Use the new application wizard to create your first application',
      action: 'Create Project'
    },
    {
      step: 2,
      title: 'View in Application Explorer',
      description: 'View your application in the application explorer to build, debug, and manage your project',
      action: 'View Application Explorer'
    }
  ];

  onGetStarted() {
    this.be.sendRequestWithArgs('gettingStarted', null);
  }

  onViewDocumentation() {
    this.be.sendRequestWithArgs('documentation', null);
  }

  onCommunity() {
    this.be.sendRequestWithArgs('community', null);
  }

  onBrowseExamples() {
    this.be.sendRequestWithArgs('browseExamples', null);
  }

  onAddSoftware() {
    this.be.sendRequestWithArgs('runSetupProgram', null);
  }
}
