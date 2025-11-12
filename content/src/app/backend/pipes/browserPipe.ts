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

import { PipeInterface } from "./pipeInterface";
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { inject, Injectable } from "@angular/core";
import { BackEndToFrontEndResponse, FrontEndToBackEndRequest, PlatformType } from "../../../comms";

@Injectable({
    providedIn: 'root'
})
export class BrowserPipe implements PipeInterface {
    private responseHandler: ((response: BackEndToFrontEndResponse) => void) | null = null;
    private http_client_: HttpClient = inject(HttpClient);

    constructor() {
    }

    get displayName(): string {
        return 'browser';
    }

    get platform(): PlatformType {
        return 'browser';
    }

    registerResponseHandler(handler: (response: BackEndToFrontEndResponse) => void): void {
        this.responseHandler = handler;
    }

    sendRequest(command: FrontEndToBackEndRequest): void {
        let reqstr = JSON.stringify(command);
        // Use btoa for base64 encoding in browsers (handles ASCII only)
        let req64 = btoa(unescape(encodeURIComponent(reqstr)));
        let req = '/request?data=' + encodeURIComponent(req64);

        this.http_client_.get(req, { responseType: 'text' }).subscribe({
            next: (response: string) => {
                if (response && response.length > 0) {
                    let respCmd: BackEndToFrontEndResponse = JSON.parse(response);
                    if (this.responseHandler) {
                        this.responseHandler(respCmd);
                    } else {
                        console.error('No response handler registered');
                    }
                }
            },
            error: (err) => {
                console.error(`Error in request: ${err}`);
            }
        });
    }
}
