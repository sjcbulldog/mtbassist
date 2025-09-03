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

import { Component, Input, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { BackendService } from '../backend/backend-service';
import { GettingStarted } from '../getting-started/getting-started';
import { CreateProject } from '../create-project/create-project';
import { ApplicationStatus } from '../application-status/application-status';
import { DevkitListComponent } from "../devkit-list/devkit-list.component";
import { RecentlyOpenedComponent } from "../recently-opened/recently-opened.component";
import { GlossaryComponent } from "../glossary/glossary.component";
import { SettingsEditor } from "../settings-editor/settings-editor";
import { LocalContentStorageComponent } from "../local-content-storage/local-content-storage";
import { AIViewComponent } from "../ai-view/ai-view.component";
import { UsersGuideComponent } from "../users-guide/users-guide.component";

export interface MtbNavTab {
  label: string;
  component: any;
  disabled?: boolean;
  icon?: string;
}

@Component({
  selector: 'mtb-nav',
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    GettingStarted,
    CreateProject,
    ApplicationStatus,
    DevkitListComponent,
    RecentlyOpenedComponent,
    GlossaryComponent,
    SettingsEditor,
    LocalContentStorageComponent,
    // AIViewComponent,
    UsersGuideComponent
],
  templateUrl: './mtb-nav.html',
  styleUrl: './mtb-nav.scss'
})
export class MtbNav implements OnInit, OnDestroy {
  @Input() tabs: MtbNavTab[] = [];
  @Input() backgroundColor: 'primary' | 'accent' | 'warn' = 'primary';
  @Input() alignment: 'start' | 'center' | 'end' = 'center';
  @Input() selectedIndex: number = 0;
  @ViewChild('glossary') glossary!: GlossaryComponent;

  private subscriptions: Subscription[] = [];
  lcsBusy: boolean = false;
  manifestStatus: string = 'loading';

  constructor(private be: BackendService) {
  }

  ngOnInit() {
    // Subscribe to local content storage busy state
    this.subscriptions.push(
      this.be.lcsBusy.subscribe(busy => {
        this.lcsBusy = busy;
      })
    );
    
    // Subscribe to manifest status
    this.subscriptions.push(
      this.be.manifestStatus.subscribe(status => {
        this.manifestStatus = status;
      })
    );

    this.subscriptions.push(
      this.be.navTab.subscribe(tab => {
        this.selectedIndex = tab;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onTabChange(index: number) {
    this.selectedIndex = index;
  }
}

export default MtbNav;
