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
        console.log('ElectronPipe initialized');
    }

    get displayName(): string {
        return 'ElectronPipe';
    }

    get platform() : PlatformType {
        return 'electron' ;
    }

    registerResponseHandler(handler: (response: BackEndToFrontEndResponse) => void): void {
        this.responseHandler = handler;
        console.log('Response handler registered');
        window.feexpAPI.receive('postMessage', (response: BackEndToFrontEndResponse) => {
            console.log('Response received:', JSON.stringify(response)); 
            if (this.responseHandler) {
                this.responseHandler(response);
            }
        });
    }

    sendRequest(command: FrontEndToBackEndRequest): void {
        window.feexpAPI.send('postMessage', command);
    }
}