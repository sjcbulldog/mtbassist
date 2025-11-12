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

import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DevKitInfo } from '../../comms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BackendService } from '../backend/backend-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-devkit-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReactiveFormsModule, MatTooltipModule, MatAutocompleteModule, MatInputModule, MatFormFieldModule],
  templateUrl: './devkit-list.component.html',
  styleUrls: ['./devkit-list.component.scss']
})
export class DevkitListComponent implements OnInit, OnDestroy {
  devkits: DevKitInfo[] = [];
  themeType: 'dark' | 'light' = 'light';
  
  // Track filtered BSP choices for each kit
  filteredBspChoices: Map<string, string[]> = new Map();
  // Track current filter text for each kit
  bspFilterText: Map<string, string> = new Map();

  private subscriptions: Subscription[] = [];

  constructor(private be: BackendService, private cdr: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.be.ready.subscribe((ready) => {
        if (ready) {
          this.be.sendRequestWithArgs('kit-data', null);
        }
      })
    );

    this.subscriptions.push(
      this.be.devKitStatus.subscribe({
        next: (data) => {
          // Sort BSP choices alphabetically for each dev kit
          this.devkits = data.map(kit => ({
            ...kit,
            bspChoices: [...kit.bspChoices].sort((a, b) => a.localeCompare(b))
          }));
          
          // Initialize filtered choices and filter text for each kit
          this.devkits.forEach(kit => {
            this.filteredBspChoices.set(kit.serial, kit.bspChoices);
            this.bspFilterText.set(kit.serial, kit.bsp || '');
          });
          
          this.cdr.detectChanges();
        }
      })
    );

    // Subscribe to theme changes
    this.subscriptions.push(
      this.be.theme.subscribe(theme => {
        this.themeType = theme as 'dark' | 'light';
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  refreshDevKits() {
    this.be.sendRequestWithArgs('kit-data', null) ;
  }

  updateFirmware(kit: DevKitInfo) {
    this.be.sendRequestWithArgs('updateFirmware', kit);
  }

  onBspChange(kit: DevKitInfo, event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const selectedBsp = selectElement.value;
    this.be.sendRequestWithArgs('updateDevKitBsp', { kit, bsp: selectedBsp });
  }

  onBspFilterChange(kit: DevKitInfo, filterValue: string) {
    this.bspFilterText.set(kit.serial, filterValue);
    
    // Filter the BSP choices based on the input
    const filtered = kit.bspChoices.filter(bsp => 
      bsp.toLowerCase().includes(filterValue.toLowerCase())
    );
    this.filteredBspChoices.set(kit.serial, filtered);
  }

  onBspInputFocus(kit: DevKitInfo) {
    // When input is focused, show all options if no filter text
    const currentText = this.bspFilterText.get(kit.serial) || '';
    if (!currentText) {
      this.filteredBspChoices.set(kit.serial, kit.bspChoices);
    }
  }

  onBspSelected(kit: DevKitInfo, selectedBsp: string) {
    // Update the kit's BSP
    kit.bsp = selectedBsp;
    this.bspFilterText.set(kit.serial, selectedBsp);
    this.be.sendRequestWithArgs('updateDevKitBsp', { kit, bsp: selectedBsp });
  }

  getFilteredBspChoices(kit: DevKitInfo): string[] {
    return this.filteredBspChoices.get(kit.serial) || kit.bspChoices;
  }

  getBspFilterText(kit: DevKitInfo): string {
    return this.bspFilterText.get(kit.serial) || kit.bsp || '';
  }
}
