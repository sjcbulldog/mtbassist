
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { GettingStarted } from '../getting-started/getting-started';
import { CreateProject } from '../create-project/create-project';
import { ApplicationStatus } from '../application-status/application-status';
import { DevkitListComponent } from "../devkit-list/devkit-list.component";
import { RecentlyOpenedComponent } from "../recently-opened/recently-opened.component";

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
    RecentlyOpenedComponent
],
  templateUrl: './mtb-nav.html',
  styleUrl: './mtb-nav.scss'
})
export class MtbNav {
  @Input() tabs: MtbNavTab[] = [];
  @Input() backgroundColor: 'primary' | 'accent' | 'warn' = 'primary';
  @Input() alignment: 'start' | 'center' | 'end' = 'center';
  @Input() selectedIndex: number = 0;

  constructor() {}

  onTabChange(index: number) {
    this.selectedIndex = index;
    console.log(`Tab changed to index: ${index}`);
  }
}

export default MtbNav;
