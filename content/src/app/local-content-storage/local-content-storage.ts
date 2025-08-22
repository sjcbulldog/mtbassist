import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'app-local-content-storage',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
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

  private subscriptions: Subscription[] = [];

  constructor(private backendService: BackendService) {}

  ngOnInit(): void {
    // Subscribe to backend data
    this.subscriptions.push(
      this.backendService.bspsNotIn.subscribe(bsps => {
        this.bspsNotInList = [...bsps];
        this.busy = false ;
      })
    );

    this.subscriptions.push(
      this.backendService.bspsIn.subscribe(bsps => {
        this.bspsInList = [...bsps];
        this.busy = false ;
      })
    );

    this.subscriptions.push(
      this.backendService.lcsToAdd.subscribe(bsps => {
        this.bspsToAdd = [...bsps];
        this.busy = false ;
      })
    );

    this.subscriptions.push(
      this.backendService.lcsToDelete.subscribe(bsps => {
        this.bspsToDelete = [...bsps];
        this.busy = false ;
      })
    );

    this.subscriptions.push(
      this.backendService.theme.subscribe(theme => {
        this.themeType = theme;
      })
    );

    this.subscriptions.push(
      this.backendService.lcsNeedsUpdate.subscribe(needsUpdate => {
        this.needsUpdate = needsUpdate;
        this.busy = false ;
      })
    );

    this.subscriptions.push(
      this.backendService.lcsNeedsApply.subscribe(needsApply => {
        this.needsApply = needsApply;
        this.busy = false ;
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
      // Get the BSP name being moved
      const movedBsp = event.previousContainer.data[event.previousIndex];
      
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      
      // Send the toggle command to the backend with the BSP name
      this.backendService.sendRequestWithArgs('lcscmd', { cmd: 'togglebsp', bsp: movedBsp });
    }
  }

  startUpdate(): void {
    this.busy = true ;
    this.backendService.sendRequestWithArgs('lcscmd', { cmd: 'update', data: { action: 'start' } });
  }

  checkForUpdates(): void {
    this.backendService.sendRequestWithArgs('lcscmd', { cmd: 'check', data: null });
  }

  applyBspChanges(): void {
    this.busy = true ;
    this.backendService.sendRequestWithArgs('lcscmd', { cmd: 'apply', data: null });
  }

  moveToLocalStorage(): void {
    // Move all BSPs from "Not In Local Storage" to "In Local Storage"
    const bspsToMove = [...this.bspsNotInList];
    if (bspsToMove.length > 0) {
      this.backendService.sendRequestWithArgs('lcscmd', { cmd: 'moveAllToLocal', data: bspsToMove });
    }
  }

  removeFromLocalStorage(): void {
    // Move all BSPs from "In Local Storage" to "Not In Local Storage"
    const bspsToRemove = [...this.bspsInList];
    if (bspsToRemove.length > 0) {
      this.backendService.sendRequestWithArgs('lcscmd', { cmd: 'removeAllFromLocal', data: bspsToRemove });
    }
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
}
