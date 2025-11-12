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

declare global {
    interface Window {
      feexpAPI: {
        send(name: string, arg?: any): void;
        receive(name: string, callback: (arg: any) => void): void;
        receiveOff(name: string, callback: (arg: any) => void): void;
      };
    }
}

export class ElectronPipe implements PipeInterface {
    private responseHandler: ((response: BackEndToFrontEndResponse) => void) | null = null;

    constructor() {
    }

    get displayName(): string {
        return 'ElectronPipe';
    }

    get platform() : PlatformType {
        return 'electron' ;
    }

    registerResponseHandler(handler: (response: BackEndToFrontEndResponse) => void): void {
        this.responseHandler = handler;
        window.feexpAPI.receive('postMessage', (response: BackEndToFrontEndResponse) => {
            if (this.responseHandler) {
                this.responseHandler(response);
            }
        });
    }

    sendRequest(command: FrontEndToBackEndRequest): void {
        window.feexpAPI.send('postMessage', command);
    }
}