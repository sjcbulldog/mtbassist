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

import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'app-users-guide',
  templateUrl: './users-guide.component.html',
  styleUrls: ['./users-guide.component.scss']
})
export class UsersGuideComponent implements OnInit {
  userGuideHtml: SafeHtml = '';
  themeType: 'dark' | 'light' = 'dark' ;

  constructor(private backend: BackendService, private sanitizer: DomSanitizer) {
  }

  ngOnInit(): void {
    this.backend.userGuide.subscribe(html => {
      this.userGuideHtml = this.sanitizer.bypassSecurityTrustHtml(html || '');
    });

    this.backend.ready.subscribe(ready => {
        if (ready) {
            this.backend.sendRequestWithArgs('user-guide-data', null) ;
        }
    });

    this.backend.theme.subscribe(theme => {
        this.themeType = (theme === 'light') ? 'light' : 'dark' ;
        this.backend.sendRequestWithArgs('user-guide-data', theme);
    });
  }
}
