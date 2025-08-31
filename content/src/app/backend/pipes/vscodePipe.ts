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
