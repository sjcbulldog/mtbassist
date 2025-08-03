
export type PlatformType = 'browser' | 'electron' | 'vscode' ;

export type FrontEndToBackEndRequestType = 
    'logMessage' | 
    'setPlatform' |
    'getDevKits' |
    'getStarted' |
    'platformSpecific' |
    'browseForFolder' ;

export type BackEndToFrontEndResponseType =
    'setDevKits' |
    'success' |
    'error' |
    'browseForFolderResult' ;

export interface BSPIdentifier {
    name : string ;
    id: string ;
    device: string ;
    connectivity: string ;
    category: string ;
}    

export type DevKitDataType = 'cached' | 'manifest' | 'empty' | 'error';

export interface DevKitData {
    datatype: DevKitDataType;
    kits: BSPIdentifier[];
}

export interface FrontEndToBackEndRequest {
    request: FrontEndToBackEndRequestType ;
    data: any ;
}

export interface BackEndToFrontEndResponse {
    response: BackEndToFrontEndResponseType ;
    data: any ;
}
