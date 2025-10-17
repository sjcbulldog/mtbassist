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

import { Component } from '@angular/core';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'idc-launcher-required',
  standalone: true,
  templateUrl: './idc-launcher-required.component.html',
  styleUrls: ['./idc-launcher-required.component.scss']
})
export class IdcLauncherRequiredComponent {
  isRetrying = false;
  
  constructor(private be: BackendService) {
  }
  
  onDownload() {
    this.be.sendRequestWithArgs('install-idc-service' , null);
  }
  
  onRetry() {
    this.isRetrying = true;
    this.be.sendRequestWithArgs('restartExtension', null);   
  }
}
