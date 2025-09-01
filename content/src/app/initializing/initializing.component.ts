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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'app-initializing',
  standalone: true,
  imports: [],
  templateUrl: './initializing.component.html',
  styleUrl: './initializing.component.scss'
})
export class InitializingComponent implements OnInit, OnDestroy {
  themeType: 'dark' | 'light' = 'dark';
  private themeSubscription?: Subscription;

  constructor(private backendService: BackendService) {}

  ngOnInit() {
    this.themeSubscription = this.backendService.theme.subscribe(theme => {
      this.themeType = theme as 'dark' | 'light';
    });
  }

  ngOnDestroy() {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }
}
