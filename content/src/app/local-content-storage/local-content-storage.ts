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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'app-local-content-storage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatListModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatInputModule,
    MatFormFieldModule,
    DragDropModule
  ],
  templateUrl: './local-content-storage.html',
  styleUrls: ['./local-content-storage.scss']
})
export class LocalContentStorageComponent implements OnInit, OnDestroy {
  bspsNotInList: string[] = [];
  bspsInList: string[] = [];
  bspsToAdd: string[] = [];
  bspsToDelete: string[] = [];
  themeType: string = 'light';
  needsUpdate: boolean = false ;
  needsApply: boolean = false ;
  busy: boolean = false ;
  showChanges: boolean = false;
  leftListFilterText: string = '';

  private subscriptions: Subscription[] = [];

  constructor(private be: BackendService) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.be.ready.subscribe(ready => {
        this.be.sendRequestWithArgs('lcs-data', null) ;
      })
    ) ;

    // Subscribe to backend data
    this.subscriptions.push(
      this.be.bspsNotIn.subscribe(bsps => {
        this.bspsNotInList = [...bsps];
      })
    );

    this.subscriptions.push(
      this.be.bspsIn.subscribe(bsps => {
        this.bspsInList = [...bsps];
      })
    );

    this.subscriptions.push(
      this.be.lcsToAdd.subscribe(bsps => {
        this.bspsToAdd = [...bsps];
      })
    );

    this.subscriptions.push(
      this.be.lcsToDelete.subscribe(bsps => {
        this.bspsToDelete = [...bsps];
      })
    );

    this.subscriptions.push(
      this.be.theme.subscribe(theme => {
        this.themeType = theme;
      })
    );

    this.subscriptions.push(
      this.be.lcsNeedsUpdate.subscribe(needsUpdate => {
        this.needsUpdate = needsUpdate;
      })
    );

    this.subscriptions.push(
      this.be.lcsNeedsApply.subscribe(needsApply => {
        this.needsApply = needsApply;
      })
    );

    this.subscriptions.push(
      this.be.lcsBusy.subscribe(busy => {
        this.busy = busy;
      })
    );

    this.subscriptions.push(
        this.be.manifestStatus.subscribe(status => {
          if (status === 'loaded') {
            this.be.sendRequestWithArgs('lcs-data', null) ;
          }
        })
      );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Get the BSP name being moved from the drag data (this works correctly with filtered lists)
      const movedBsp = event.item.data;
      
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      
      // Send the toggle command to the backend with the BSP name
      this.be.sendRequestWithArgs('lcscmd', { cmd: 'togglebsp', bsp: movedBsp });
    }
  }

  startUpdate(): void {
    this.be.lcsBusy.next(true);
    this.be.sendRequestWithArgs('lcscmd', { cmd: 'update', data: { action: 'start' } });
  }

  checkForUpdates(): void {
    this.be.lcsBusy.next(true);
    this.be.sendRequestWithArgs('lcscmd', { cmd: 'check', data: null });
  }

  applyBspChanges(): void {
    this.be.lcsBusy.next(true);
    this.be.sendRequestWithArgs('lcscmd', { cmd: 'apply', data: null });
    
    // Uncheck show changes and clear filter when applying changes
    this.showChanges = false;
    this.leftListFilterText = '';
  }

  moveToLocalStorage(): void {
    // Move all BSPs from "Not In Local Storage" to "In Local Storage"
    const bspsToMove = [...this.bspsNotInList];
    if (bspsToMove.length > 0) {
      this.be.sendRequestWithArgs('lcscmd', { cmd: 'moveAllToLocal', data: bspsToMove });
    }
  }

  removeFromLocalStorage(): void {
    // Move all BSPs from "In Local Storage" to "Not In Local Storage"
    const bspsToRemove = [...this.bspsInList];
    if (bspsToRemove.length > 0) {
      this.be.sendRequestWithArgs('lcscmd', { cmd: 'removeAllFromLocal', data: bspsToRemove });
    }
  }

  onRevert(): void {
    this.be.sendRequestWithArgs('lcscmd', { cmd: 'revert', data: null });
  }

  // Helper methods for visual highlighting
  isInDeleteQueue(bsp: string): boolean {
    return this.bspsToDelete.includes(bsp);
  }

  isInAddQueue(bsp: string): boolean {
    return this.bspsToAdd.includes(bsp);
  }

  getBspClasses(bsp: string, isInLocalStorage: boolean): string {
    let classes = 'bsp-item';
    
    if (!isInLocalStorage && this.isInDeleteQueue(bsp)) {
      classes += ' pending-delete';
    } else if (isInLocalStorage && this.isInAddQueue(bsp)) {
      classes += ' pending-add';
    }

    // if (bsp === 'CY8CEVAL-062S2') {
    //   this.backendService.log('CY8CEVAL-062S2 detected - reporting data') ;
    //   this.backendService.log(`    isInLocalStorage: ${isInLocalStorage}`);
    //   this.backendService.log(`    isInAddQueue: ${this.isInAddQueue(bsp)}`);
    //   this.backendService.log(`    isInDeleteQueue: ${this.isInDeleteQueue(bsp)}`);
    //   this.backendService.log(`    addQueue: ${JSON.stringify(this.bspsToAdd)}`);
    //   this.backendService.log(`    deleteQueue: ${JSON.stringify(this.bspsToDelete)}`);
    //   this.backendService.log(`    classes: ${classes}`);
    // }

    return classes;
  }

  // Getter methods for filtered lists based on showChanges checkbox
  get displayedBspsNotIn(): string[] {
    let filteredList = this.bspsNotInList;
    
    // Apply show changes filter first
    if (this.showChanges) {
      // Show only BSPs that are in the delete queue (BSPs that are currently local but will be removed)
      filteredList = filteredList.filter(bsp => this.isInDeleteQueue(bsp));
    }
    
    // Apply text filter
    if (this.leftListFilterText && this.leftListFilterText.trim()) {
      const filterText = this.leftListFilterText.toLowerCase().trim();
      filteredList = filteredList.filter(bsp => bsp.toLowerCase().includes(filterText));
    }
    
    return filteredList;
  }

  get displayedBspsIn(): string[] {
    if (this.showChanges) {
      // Show only BSPs that are in the add queue (BSPs that will be added to local storage)
      return this.bspsInList.filter(bsp => this.isInAddQueue(bsp));
    }
    return this.bspsInList;
  }

  onShowChangesChange(checked: boolean): void {
    this.showChanges = checked;
    if (checked) {
      // Clear the filter text when show changes is enabled
      this.leftListFilterText = '';
    }
  }
}
