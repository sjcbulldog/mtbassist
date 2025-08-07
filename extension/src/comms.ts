
export type PlatformType = 'browser' | 'electron' | 'vscode' ;

export type FrontEndToBackEndRequestType = 
    'logMessage' | 
    'setPlatform' |
    'getDevKits' |
    'getCodeExamples' |
    'getStarted' |
    'createProject' |
    'loadWorkspace' |
    'getAppStatus' |
    'platformSpecific' |
    'browseForFolder' ;

export type BackEndToFrontEndResponseType =
    'setDevKits' |
    'setCodeExamples' |
    'createProjectResult' |
    'browseForFolderResult' |
    'appStatusResult' |
    'oob' |
    'success' |
    'error' ;

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

export interface MemoryUsage {
  type: string;
  used: number;
  total: number;
  percentage: number;
  unit: string;
}

export interface MemoryStats {
  totalUsed: number;
  totalAvailable: number;
  memoryTypes: MemoryUsage[];
  lastUpdated: Date;
}


export interface MemoryInfo {
  type: string;
  used: number;
  total: number;
  percentage: number;
}

export interface Documentation {
  name: string;
  type: 'pdf' | 'html' | 'markdown' | 'text';
  size: string;
  lastModified: Date;
  url?: string;
}

export interface Middleware {
  name: string;
  version: string;
  status: 'active' | 'inactive' | 'error';
  description: string;
}

export interface Tool {
  name: string;
  version: string;
  id: string;
}

export interface Project {
  name: string;
  documentation: Documentation[];
  middleware: Middleware[];
  tools: Tool[];
}

export interface ApplicationStatusData {
  valid: boolean ;
  name: string;
  memory: MemoryInfo[];
  documentation: Documentation[];
  middleware: Middleware[];
  projects: Project[];
  tools: Tool[];
}
