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

export interface InvalidCompilerPath {
  name: string;
  displayName: string;
  path: string;
}

@Component({
  selector: 'app-invalid-paths-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './invalid-paths-dialog.component.html',
  styleUrls: ['./invalid-paths-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class InvalidPathsDialogComponent {
  @Input() isVisible: boolean = false;
  @Input() invalidPaths: InvalidCompilerPath[] = [];
  @Input() themeType: 'dark' | 'light' = 'light';

  constructor(private be: BackendService) {
  }

  onOkClick(): void {
    this.be.showInvalidPathsDialog.next({ visible: false, invalidPaths: [] });
  }

  onOverlayClick(event: MouseEvent): void {
    // Close overlay if clicking on the backdrop
    if (event.target === event.currentTarget) {
      this.onOkClick();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' || event.key === 'Enter') {
      this.onOkClick();
    }
  }
}
