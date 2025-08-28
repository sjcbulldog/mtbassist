
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
    AIViewComponent
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

  constructor(private backendService: BackendService) {
  }

  ngOnInit() {
    // Subscribe to local content storage busy state
    this.subscriptions.push(
      this.backendService.lcsBusy.subscribe(busy => {
        this.backendService.log(`lcsbusy is ${busy}`) ;
        this.lcsBusy = busy;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onTabChange(index: number) {
    // Prevent tab changes when local content storage is busy
    if (this.lcsBusy) {
      return;
    }
    this.selectedIndex = index;
  }
}

export default MtbNav;
