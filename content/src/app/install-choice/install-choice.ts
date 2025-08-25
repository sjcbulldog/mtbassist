import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../backend/backend-service';

export type InstallChoiceType = 'home' | 'custom';

@Component({
  selector: 'app-install-choice',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatInputModule, FormsModule],
  templateUrl: './install-choice.html',
  styleUrls: ['./install-choice.scss']
})
export class InstallChoiceComponent {
  @Input() selected: InstallChoiceType | null = null;

  // Error / warning messages (externally provided)
  @Input() homeError?: string;
  @Input() homeWarning?: string;
  @Input() customError?: string;
  @Input() customWarning?: string;

  // The custom path selected by the user (two-way bound externally if desired)
  @Input() customPath: string = '';
  @Output() customPathChange = new EventEmitter<string>();

  @Output() selectionChange = new EventEmitter<InstallChoiceType>();
  @Output() browseForFolder = new EventEmitter<void>();

  constructor(private backend: BackendService) {
    this.backend.browserFolder.subscribe(reply => {
        if (reply && reply.tag === 'customToolInstall') {
          this.customPath = reply.path ;
          this.customPathChange.emit(this.customPath);
        }
    });

    this.homeError = 'Your user name contains spaces and therefore cannot be used for installation.  Please pick a custom path for installation.';
    this.customWarning = 'This path is not writable by the user and will required administrative privileges to install.';
  }

  select(choice: InstallChoiceType) {
    // Don't allow selecting a card that has an error
    if ((choice === 'home' && this.homeError) || (choice === 'custom' && this.customError)) {
      return;
    }
    this.selected = choice;
    this.selectionChange.emit(choice);
  }

  onBrowse() {
    if (this.customError) { return; }
    this.browseForFolder.emit();
    this.backend.browseForFolder('customToolInstall');
  }

  onCustomPathInput(value: string) {
    this.customPath = value;
    this.customPathChange.emit(value);
  }

  isSelected(choice: InstallChoiceType): boolean {
    return this.selected === choice;
  }
}
