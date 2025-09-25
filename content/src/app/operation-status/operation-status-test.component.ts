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

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'app-operation-status-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="test-controls">
      <h3>Operation Status Component Test</h3>
      <div class="button-group">
        <button (click)="startTestOperation()">Start Test Operation</button>
        <button (click)="addTestLine()">Add Status Line</button>
        <button (click)="finishTestOperation()">Finish Operation</button>
        <button (click)="runFullTest()">Run Full Test</button>
      </div>
      <p><em>The operation status component will appear as an overlay when operations are running.</em></p>
    </div>
  `,
  styles: [`
    .test-controls {
      padding: 20px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      margin: 20px;
      max-width: 600px;
    }
    
    .button-group {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 15px 0;
    }
    
    button {
      padding: 10px 16px;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s ease;
    }
    
    button:hover {
      background: #005a9b;
    }
    
    button:active {
      background: #004578;
    }
    
    p {
      margin: 10px 0 0 0;
      color: #6c757d;
      font-size: 14px;
    }
  `]
})
export class OperationStatusTestComponent {
  private lineCounter = 1;

  constructor(private backendService: BackendService) {}

  startTestOperation(): void {
    this.lineCounter = 1;
    this.backendService.startOperation.next('Testing Operation Status Component');
  }

  addTestLine(): void {
    this.backendService.addStatusLine.next(`Status line ${this.lineCounter}: Processing item ${this.lineCounter}...`);
    this.lineCounter++;
  }

  finishTestOperation(): void {
    this.backendService.finishOperation.next('Testing Operation Status Component');
  }

  async runFullTest(): Promise<void> {
    // Start the operation
    this.startTestOperation();
    
    // Add several status lines with delays
    for (let i = 1; i <= 5; i++) {
      await this.delay(800);
      this.backendService.addStatusLine.next(`Step ${i}: Processing item ${i}...`);
    }
    
    // Finish the operation
    await this.delay(1000);
    this.finishTestOperation();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}