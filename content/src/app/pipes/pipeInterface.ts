import { BackEndToFrontEndResponse, FrontEndToBackEndRequest, PlatformType } from "../../comms";

export interface PipeInterface {
    get displayName() : string ;
    get platform() : PlatformType ;
    registerResponseHandler(handler: (response: BackEndToFrontEndResponse) => void): void;
    sendRequest(command: FrontEndToBackEndRequest): void;
}
