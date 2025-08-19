export type PlatformType = 'browser' | 'electron' | 'vscode' ;

export type FrontEndToBackEndRequestType = 
    'logMessage' | 
    'getBSPs' |
    'getCodeExamples' |
    'getStarted' |
    'createProject' |
    'loadWorkspace' |
    'getAppStatus' |
    'browseForFolder' |
    'fixMissingAssets' |
    'buildAction' |
    'gettingStarted' |
    'documentation' | 
    'browseExamples' |
    'community' |
    'open' |
    'libmgr' |
    'devcfg' |
    'tool' |
    'refreshDevKits' |
    'updateFirmware' |
    'recentlyOpened' |
    'openRecent' |
    'openReadme' |
    'initSetup' |
    'installTools' |
    'restartExtension' |
    'runSetupProgram'|
    'setIntellisenseProject' |
    'updateDevKitBsp'
    ;

export type BackEndToFrontEndResponseType =
    'setBSPs' |
    'setCodeExamples' |
    'createProjectResult' |
    'browseForFolderResult' |
    'appStatusResult' |
    'oob' |
    'success' |
    'error' ;

export type MTBInstallType = 
    'none' |
    'launcher' |
    'mtb' ;

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

export type BSPsDataType = 'cached' | 'manifest' | 'empty' | 'error';

export interface BSPData {
    datatype: BSPsDataType;
    bsps: BSPIdentifier[];
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
    launchData: any ;
}

export interface ProjectInfo {
    name: string ;
    libraries: Middleware[] ;
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
  location: string ;
}

export interface Middleware {
  name: string;
  version: string;
  newer: boolean ;
}

export interface Tool {
  name: string;
  version: string;
  id: string;
}

export interface ComponentInfo {
  name: string ;
  description : string ;
  version?: string ;
  type?: string ;
}

export interface Project {
  name: string;
  documentation: Documentation[];
  middleware: Middleware[];
  tools: Tool[];
  missingAssets: boolean;
  missingAssetDetails: string[];
  components: ComponentInfo[];
  enabledComponents?: ComponentInfo[];
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

export interface DevKitInfo {
  name: string ;
  serial: string ;
  firmwareVersion: string ;
  boardFeatures: string[] ;
  kitProgType: string ;
  usbMode: string ;
  bridgingTypes : string[] ; 
  fwOutOfDate: boolean ;
  bsp: string ;
  bspChoices: string[] ;
  status: string ;
}

export interface RecentEntry {
    apppath: string ;
    lastopened: Date;
    bspname: string ;
} ;

export interface MTBSetting {
    name: string ;
    owner: 'modus' | 'extension' ;
    type: 'string' | 'number' | 'boolean' | 'choice' | 'uri' | 'dirpath' | 'filepath' ;
    value: string | number | boolean ;
    choices? : string[] ;
    description: string ;
}

export interface SetupProgram {
    featureId: string;
    name: string;
    version: string ;
    current?: string ;
    required: boolean ;
    installed: boolean ;
    upgradable: boolean ;
    path?: string ;
}

export interface InstallProgress {
  featureId: string ;
  message: string ;
  percent: number ;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  category?: string;
}