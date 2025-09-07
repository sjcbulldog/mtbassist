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

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './error.component.html',
  styleUrl: './error.component.scss'
})
export class ErrorComponent implements OnInit, OnDestroy {
  message: string = 'An error has occurred';
  icon: string = 'error';
  
  themeType: 'dark' | 'light' = 'dark';

  private errmsgSubscription?: Subscription;
  private themeSubscription?: Subscription;

  constructor(private be: BackendService) {
    this.be.log('ErrorComponent initialized', 'debug') ;
  }

  ngOnInit() {
    this.be.log('ErrorComponent ngOnInit', 'debug') ;

    this.themeSubscription = this.be.theme.subscribe(theme => {
      this.themeType = theme as 'dark' | 'light';
    });

    this.errmsgSubscription = this.be.errorMessage.subscribe(msg => {
      this.be.log(`ErrorComponent received error message: ${msg}`, 'debug') ;
      if (msg) {
        this.message = msg;
      }
    }); 
  }

  ngOnDestroy() {
    this.be.log('ErrorComponent ngOnDestroy', 'debug') ;
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }

    if (this.errmsgSubscription) {
      this.errmsgSubscription.unsubscribe();
    }
  }
}
