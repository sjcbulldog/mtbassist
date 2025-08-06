
export type PlatformType = 'browser' | 'electron' | 'vscode' ;

export type FrontEndToBackEndRequestType = 
    'logMessage' | 
    'setPlatform' |
    'getDevKits' |
    'getCodeExamples' |
    'getStarted' |
    'createProject' |
    'loadWorkspace' |
    'platformSpecific' |
    'browseForFolder' ;

export type BackEndToFrontEndResponseType =
    'setDevKits' |
    'setCodeExamples' |
    'createProjectResult' |
    'oob' | 
    'success' |
    'error' |
    'browseForFolderResult' ;

export interface BSPIdentifier {
    name : string ;
    id: string ;
    device: string ;
    connectivity: string ;
    category: string ;
    description: string;
}    

export interface CodeExampleIdentifier {
    name: string;
    id: string;
    category: string ;
    description?: string; // Optional description of the example
}

export interface CreateProjectResponse {
    uuid: string ;
    success: boolean ;
    message?: string;
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

export interface RecentlyOpenedProject {
    directory: string ;
    when: string ; // ISO date/time string
} ;

export interface Document {
    title: string ;
    url: string ;
}

export interface Tool {
    name: string;          // Name of the tool
    id: string ;
}

export interface MemoryUsage {
    memtype: string ;       // The name of the memory
    size: number;           // Size in bytes
    used: number;           // Used size in bytes
}

export interface MiddlewareLibrary {
    title: string ;
    id: string ;
    version: string ;
}

export interface ProjectInfo {
    name: string ;
    libraries: MiddlewareLibrary[] ;
    documents: Document[] ;
    tools: Tool[] ;
}

export interface ApplicationInfo {
    documents: Document[] ;
    projects: ProjectInfo[] ;
    memoryUsage: MemoryUsage[] ;
    tools: Tool[] ;
}
