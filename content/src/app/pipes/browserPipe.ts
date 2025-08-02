import { PipeInterface } from "./pipeInterface";
import { Buffer } from "buffer";
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { inject, Injectable } from "@angular/core";
import { BackEndToFrontEndResponse, FrontEndToBackEndRequest, PlatformType } from "../../comms";

@Injectable({
  providedIn: 'root'
})
export class BrowserPipe implements PipeInterface {
    private responseHandler: ((response: BackEndToFrontEndResponse) => void) | null = null;
    private http_client_ : HttpClient = inject(HttpClient) ;

    constructor() {
        console.log('BrowserPipe initialized');
    }

    get displayName(): string {
        return 'browser';
    }

    get platform() : PlatformType {
        return 'browser' ;
    }

    registerResponseHandler(handler: (response: BackEndToFrontEndResponse) => void): void {
        this.responseHandler = handler;
        console.log('Response handler registered');
    }

    sendRequest(command: FrontEndToBackEndRequest): void {
        console.log(`Sending request: ${command.request}`);
        let reqstr = JSON.stringify(command) ;
        let reqbuffer = Buffer.from(reqstr, 'utf8');
        let req64 = reqbuffer.toString('base64');
        let req = '/request?data=' + encodeURIComponent(req64);

        this.http_client_.get(req, { responseType: 'text' }).subscribe({
            next: (response: string) => {
                console.log(`Response received: ${response}`);
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
