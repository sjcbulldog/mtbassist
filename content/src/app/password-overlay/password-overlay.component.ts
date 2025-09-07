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

import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../backend/backend-service';

export interface PasswordOverlayResult {
  password: string;
  confirmed: boolean;
}

@Component({
  selector: 'app-password-overlay',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    FormsModule
  ],
  templateUrl: './password-overlay.component.html',
  styleUrls: ['./password-overlay.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PasswordOverlayComponent {
  @Input() isVisible: boolean = false;
  @Input() title: string = 'Enter Password';
  @Input() message: string = 'Please enter your password to continue.';
  @Input() placeholder: string = 'Password';
  @Input() themeType: 'dark' | 'light' = 'light';
  
  password: string = '';
  showPassword: boolean = false;

  constructor(private be: BackendService) {
  }

  onOkClick(): void {
    this.be.sendRequestWithArgs('password', this.password) ;
    this.resetForm();
  }

  onCancelClick(): void {
    this.be.sendRequestWithArgs('password', null) ;
    this.resetForm();
  }

  onOverlayClick(event: MouseEvent): void {
    // Close overlay if clicking on the backdrop
    if (event.target === event.currentTarget) {
      this.onCancelClick();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.password.trim()) {
      this.onOkClick();
    } else if (event.key === 'Escape') {
      this.onCancelClick();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private resetForm(): void {
    this.password = '';
    this.showPassword = false;
  }
}
