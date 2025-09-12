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

import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MTBSetting, SettingsError } from '../../comms';
import { BackendService } from '../backend/backend-service';
import { Subscription } from 'rxjs';

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
export class SettingsEditor implements OnInit, OnDestroy {
  settings: MTBSetting[] = [];
  themeType: 'dark' | 'light' = 'light';
  manifestStatus: 'loading' | 'loaded' | 'not-available' = 'loading';
  settingsErrors: SettingsError[] = [] ;

  private subscriptions: Subscription[] = [];

  constructor(private be: BackendService, private cdr: ChangeDetectorRef) {

  }

  ngOnInit() {
    this.be.log('SettingsEditor: ngOnInit called');
    this.subscriptions.push(
      this.be.ready.subscribe(ready => {
        if (ready) {
          this.be.sendRequestWithArgs('settings-data', null);
        }
      })
    );

    this.subscriptions.push(
      this.be.settings.subscribe(settings => {
        this.settings = settings;
        this.settingsErrors = [];
        
        // Initialize tip values for choice settings
        this.settings.forEach(setting => {
          if (setting.type === 'choice' && setting.choices && setting.tips && 
              setting.tips.length === setting.choices.length) {
            const choiceIndex = setting.choices.indexOf(String(setting.value));
            if (choiceIndex >= 0) {
              setting.tip = setting.tips[choiceIndex];
            }
          }
        });
        
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.push(
      this.be.settingsErrors.subscribe(errors => {
        this.settingsErrors.push(...errors);
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.push(this.be.manifestStatus.subscribe(status => {
      this.manifestStatus = status;
    }));

    // Subscribe to theme changes
    this.subscriptions.push(this.be.theme.subscribe(theme => {
      this.themeType = theme ;
    }));

    this.subscriptions.push(this.be.browserFolder.subscribe(folder => {
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
    }));

    this.subscriptions.push(this.be.browserFile.subscribe(file => {
      if (file) {
        for(let setting of this.settings) {
          if (setting.name === file.tag) {
            setting.value = file.path ;
            this.onValueChange(setting, file.path);
          }
        }
      }
    }));    
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
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
    setting.value = value;
    
    // If this is a choice setting with tips, update the tip property
    if (setting.type === 'choice' && setting.choices && setting.tips && 
        setting.tips.length === setting.choices.length) {
      const choiceIndex = setting.choices.indexOf(String(value));
      if (choiceIndex >= 0) {
        setting.tip = setting.tips[choiceIndex];
      } else {
        setting.tip = undefined;
      }
    }
    
    this.be.sendRequestWithArgs('updateSetting', setting);
  }

  onBrowseForFolder(setting: MTBSetting, button: string) {
    this.be.browseForFolder(setting.name, button) ;
  }

  onBrowseForFile(setting: MTBSetting) {
    this.be.browseForFile(setting.name) ;
  }

  getErrorsForSetting(settingName: string): SettingsError[] {
    return this.settingsErrors.filter(error => error.setting === settingName);
  }

  isSettingDisabled(setting: MTBSetting): boolean {
    return !!setting.disabledMessage;
  }

  getChoiceTipPairs(setting: MTBSetting): { choice: string, tip: string }[] {
    if (setting.choices && Array.isArray(setting.choices)) {
      if (setting.tips && Array.isArray(setting.tips) && setting.tips.length === setting.choices.length) {
        return setting.choices.map((choice, i) => ({ choice, tip: setting.tips![i] }));
      } else {
        return setting.choices.map((choice) => ({ choice, tip: '' }));
      }
    }
    return [];
  }
}
