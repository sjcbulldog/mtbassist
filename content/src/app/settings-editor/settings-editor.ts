import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MTBSetting } from '../../comms';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'mtb-settings-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './settings-editor.html',
  styleUrl: './settings-editor.scss'
})
export class SettingsEditor {
  settings: MTBSetting[] = [];
  themeType: 'dark' | 'light' = 'light';
  manifestStatus: 'loading' | 'loaded' | 'not-available' = 'loading';

  constructor(private be: BackendService) {
    this.be.settings.subscribe(settings => {
      this.settings = settings;
    });

    this.be.manifestStatus.subscribe(status => {
      this.manifestStatus = status;
    });

    // Subscribe to theme changes
    this.be.theme.subscribe(theme => {
      this.themeType = theme as 'dark' | 'light';
    });

    this.be.browserFolder.subscribe(folder => {
      if (folder) {
        for(let setting of this.settings) {
          if (setting.name === folder.tag) {
            if (setting.name === 'custompath') {
              // For custompath, only update if toolsversion is 'Custom'
              const toolsVersion = this.settings.find(s => s.name === 'toolsversion');
              if (toolsVersion && toolsVersion.value === 'Custom') {
                setting.value = folder.path;
                this.onValueChange(setting, folder.path);
              }
            } else {
              setting.value = folder.path;
              this.onValueChange(setting, folder.path);
            }
          }
        }
      }
    });

    this.be.browserFile.subscribe(file => {
      if (file) {
        for(let setting of this.settings) {
          if (setting.name === file.tag) {
            setting.value = file.path ;
            this.onValueChange(setting, file.path);
          }
        }
      }
    });
  }

  isValidUri(value: any): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  isCustomPathDisabled(): boolean {
    // Safety check: return false if settings not loaded yet
    if (!this.settings || this.settings.length === 0) {
      return false;
    }
    
    const customPath = this.settings.find(s => s.name === 'custompath');
    const toolsVersion = this.settings.find(s => s.name === 'toolsversion');
    // Disable if manifest is loading OR if toolsversion is not 'Custom'
    return !this.manifestStatus || (!!customPath && !!toolsVersion && toolsVersion.value !== 'Custom');
  }

  getCustomPathDisplayValue(): string {
    // Return empty string if custompath should be hidden, otherwise return the actual value
    if (this.isCustomPathDisabled()) {
      const toolsVersion = this.settings.find(s => s.name === 'toolsversion');
      // Only hide the value if toolsversion is not 'Custom' (but not if manifest is just loading)
      if (toolsVersion && toolsVersion.value !== 'Custom') {
        return '';
      }
    }
    
    const customPath = this.settings.find(s => s.name === 'custompath');
    return customPath ? String(customPath.value || '') : '';
  }

  onCustomPathDisplayValueChange(value: string) {
    // Only update the actual setting value if toolsversion is 'Custom'
    const toolsVersion = this.settings.find(s => s.name === 'toolsversion');
    const customPath = this.settings.find(s => s.name === 'custompath');
    
    if (customPath && toolsVersion && toolsVersion.value === 'Custom') {
      this.onValueChange(customPath, value);
    }
  }

  onValueChange(setting: MTBSetting, value: any) {
    setting.value = value ;
    this.be.sendRequestWithArgs('updateSetting', setting) ;
  }

  onBrowseForFolder(setting: MTBSetting) {
    this.be.browseForFolder(setting.name) ;
  }

  onBrowseForFile(setting: MTBSetting) {
    this.be.browseForFile(setting.name) ;
  }
}
