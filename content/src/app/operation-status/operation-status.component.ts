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

import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackendService } from '../backend/backend-service';
import { Subscription } from 'rxjs';
import { ThemeType } from '../../comms';

@Component({
  selector: 'app-operation-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './operation-status.component.html',
  styleUrl: './operation-status.component.scss'
})
export class OperationStatusComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() themeType: ThemeType = 'dark';
  @ViewChild('activityList', { static: false }) activityList?: ElementRef;

  isVisible: boolean = false;
  operationTitle: string = '';
  statusLines: string[] = [];
  isOperationFinished: boolean = false;

  private subscriptions: Subscription[] = [];
  private shouldScrollToBottom: boolean = false;

  constructor(private be: BackendService) {}

  ngOnInit(): void {
    // Subscribe to start operation events
    this.subscriptions.push(
      this.be.startOperation.subscribe((title: string) => {
        this.be.debug(`OperationStatusComponent: startOperation received title: ${title}`);
        this.operationTitle = title;
        this.statusLines = [];
        this.isVisible = true;
        this.isOperationFinished = false;
        this.shouldScrollToBottom = true;
      })
    );

    // Subscribe to status line additions
    this.subscriptions.push(
      this.be.addStatusLine.subscribe((line: string) => {
        this.be.debug(`OperationStatusComponent: addStatusLine received line: ${line}`);
        if (this.isVisible) {
          this.statusLines.push(line);
          this.shouldScrollToBottom = true;
        }
      })
    );

    // Subscribe to finish operation events
    this.subscriptions.push(
      this.be.finishOperation.subscribe((title: string) => {
        this.be.debug('OperationStatusComponent: finishOperation received');
        // Only mark as finished if the finish operation matches the current operation
        if (title === this.operationTitle || title === '') {
          this.isOperationFinished = true;
          this.statusLines.push('Operation completed.');
          this.shouldScrollToBottom = true;
        }
      })
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom && this.activityList) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private scrollToBottom(): void {
    if (this.activityList) {
      try {
        this.activityList.nativeElement.scrollTop = this.activityList.nativeElement.scrollHeight;
      } catch (err) {
        // Handle potential scrolling errors silently
      }
    }
  }

  onOverlayClick(event: MouseEvent): void {
    // Prevent clicks on the modal content from closing the overlay
    event.stopPropagation();
  }

  onCloseClick(): void {
    this.isVisible = false;
    this.operationTitle = '';
    this.statusLines = [];
    this.isOperationFinished = false;
    this.be.sendRequestWithArgs('operation-status-closed', null) ;
  }
}