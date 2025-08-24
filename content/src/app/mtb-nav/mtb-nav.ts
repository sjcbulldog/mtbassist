
import { Component, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { GettingStarted } from '../getting-started/getting-started';
import { CreateProject } from '../create-project/create-project';
import { ApplicationStatus } from '../application-status/application-status';
import { DevkitListComponent } from "../devkit-list/devkit-list.component";
import { RecentlyOpenedComponent } from "../recently-opened/recently-opened.component";
import { GlossaryComponent } from "../glossary/glossary.component";
import { SettingsEditor } from "../settings-editor/settings-editor";
import { LocalContentStorageComponent } from "../local-content-storage/local-content-storage";

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
    LocalContentStorageComponent
],
  templateUrl: './mtb-nav.html',
  styleUrl: './mtb-nav.scss'
})
export class MtbNav {
  @Input() tabs: MtbNavTab[] = [];
  @Input() backgroundColor: 'primary' | 'accent' | 'warn' = 'primary';
  @Input() alignment: 'start' | 'center' | 'end' = 'center';
  @Input() selectedIndex: number = 0;
  @ViewChild('glossary') glossary!: GlossaryComponent;

  constructor() {
  }

  onTabChange(index: number) {
    this.selectedIndex = index;
  }
}

export default MtbNav;
