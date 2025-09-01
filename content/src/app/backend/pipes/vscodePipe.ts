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

import { BackEndToFrontEndResponse, FrontEndToBackEndRequest, PlatformType } from "../../../comms";
import { PipeInterface } from "./pipeInterface";

declare var acquireVsCodeApi: any;

export class VSCodePipe implements PipeInterface {
    private vscode : any = acquireVsCodeApi();    
    private responseHandler: ((response: BackEndToFrontEndResponse) => void) | null = null;

    constructor() {
    }

    get displayName(): string {
        return 'VSCode';
    }

    get platform() : PlatformType {
        return 'vscode' ;
    }

    registerResponseHandler(handler: (response: BackEndToFrontEndResponse) => void): void {
        this.responseHandler = handler;
        window.addEventListener('message', (event) => {
            if (event && event.data && event.data.response && this.responseHandler) {
                try {       
                    this.responseHandler(event.data);
                }
                catch(err) {
                    this.sendRequest({request: 'logMessage', data: { level : 'error' , message : `Error occurred while handling message: ${JSON.stringify(event)}`}});
                    this.sendRequest({request: 'logMessage', data: { level : 'error' , message : `   ${(err as Error).message}`}});
                }
            }
            else if (!this.responseHandler) {
                this.sendRequest({request: 'logMessage', data: { level : 'debug' , message : 'No response handler registered in VSCodePipe!'}});
            }
            else {
                this.sendRequest({request: 'logMessage', data: { level : 'debug' , message : `received but did not handle message: ${JSON.stringify(event)}`}});
            }
        });
    }

    sendRequest(command: FrontEndToBackEndRequest): void {
        this.vscode.postMessage(command) ;
    }
}
