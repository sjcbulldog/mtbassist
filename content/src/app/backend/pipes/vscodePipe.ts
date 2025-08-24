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
            let str = JSON.stringify(event.data);
            if (str.length > 128) {
                str = str.substring(0, 128) + '...';
            }
            this.sendRequest({request: 'logMessage', data: { level : 'silly' , message : `received message: ${str}`}});
            if (event.data && event.data.response && this.responseHandler) {
                this.responseHandler(event.data);
            }
        });
    }

    sendRequest(command: FrontEndToBackEndRequest): void {
        this.vscode.postMessage(command) ;
    }
}
