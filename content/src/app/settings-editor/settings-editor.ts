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

  constructor(private be: BackendService) {
    this.be.settings.subscribe(settings => {
      this.settings = settings;
    });

    // Subscribe to theme changes
    this.be.theme.subscribe(theme => {
      this.themeType = theme as 'dark' | 'light';
    });

    this.be.browserFolder.subscribe(folder => {
      if (folder) {
        for(let setting of this.settings) {
          if (setting.name === folder.tag) {
            setting.value = folder.path ;
            this.onValueChange(setting, folder.path);
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
    const customPath = this.settings.find(s => s.name === 'custompath');
    const toolsVersion = this.settings.find(s => s.name === 'toolsversion');
    return !!customPath && !!toolsVersion && toolsVersion.value !== 'Custom';
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
