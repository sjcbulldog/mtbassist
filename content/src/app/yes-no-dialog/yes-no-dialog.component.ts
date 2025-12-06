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

import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'app-yes-no-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './yes-no-dialog.component.html',
  styleUrls: ['./yes-no-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class YesNoDialogComponent {
  @Input() isVisible: boolean = false;
  @Input() question: string = '';
  @Input() themeType: 'dark' | 'light' = 'light';

  constructor(private be: BackendService) {
  }

  onYesClick(): void {
    this.be.sendRequestWithArgs('yes-no-response', 'yes');
    this.be.showYesNoDialog.next({ visible: false, question: '' });
  }

  onNoClick(): void {
    this.be.sendRequestWithArgs('yes-no-response', 'no');
    this.be.showYesNoDialog.next({ visible: false, question: '' });
  }

  onOverlayClick(event: MouseEvent): void {
    // Close overlay if clicking on the backdrop (treat as "No")
    if (event.target === event.currentTarget) {
      this.onNoClick();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onNoClick();
    }
  }
}
