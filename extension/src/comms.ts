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

export type PlatformType = 'browser' | 'electron' | 'vscode' ;

export type FrontEndToBackEndType = 
    'logMessage' | 
    'getCodeExamples' |
    'progress' |
    'getStarted' |
    'createProject' |
    'loadWorkspace' |
    'browseForFolder' |
    'browseForFile' |
    'updateSetting' |
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
    'updateFirmware' |
    'openRecent' |
    'openReadme' |
    'initSetup' |
    'installTools' |
    'restartExtension' |
    'runSetupProgram'|
    'setIntellisenseProject' |
    'updateDevKitBsp' |
    'updateBSPStorage' |
    'lcscmd'|
    'getSettings' |
    'chooseMTBLocation' |
    'hasAccount' |
    'checkInstallPath' |
    'ai-data' |
    'app-data' |
    'cproj-data' |
    'kit-data' |
    'glossary-data' |
    'lcs-data' |
    'recent-data' |
    'settings-data' |
    'user-guide-data' |
    'check-ready' |
    'fix-tasks' |
    'prepareVSCode'
    ;

export type BackEndToFrontEndType =
    'createProjectProgress' |
    'appStatus' |
    'sendActiveBSPs' |
    'sendAllBSPs' |
    'sendAllBSPsExceptEAP' |
    'sendCodeExamples' |
    'recentlyOpened' |
    'selectTab' |
    'loadedAsset' |
    'devKitStatus' |
    'allbsps' |
    'mtbMode' |
    'setupTab' |
    'neededTools' |
    'installProgress' |
    'glossaryEntries' |
    'setIntellisenseProject' |
    'setTheme' |
    'settings' |
    'manifestStatus' |
    'lcsBspsNoIn' |
    'lcsBspsIn' |
    'lcsNeedsUpdate' |
    'lcsNeedsApply' |
    'lcsToAdd' |
    'lcsToDelete' |
    'createProjectResult' |
    'browseForFolderResult' |
    'browseForFileResult' |
    'appStatusResult' | 
    'sendDefaultProjectDir' |
    'showSettingsError' |
    'setChooseMTBLocationStatus' |
    'apikey' | 
    'error' |
    'justNeedTools' |
    'tools-loc-error' |
    'ready' |
    'os' |
    'userguide' |
    'buildDone'
    ;

export type ThemeType =
    'dark' | 
    'light' ;

export type ManifestStatusType = 
    'loaded' | 
    'loading' | 
    'not-available';

export type MTBAssistantMode = 
    'initializing' |
    'none' |
    'launcher' |
    'mtb' |
    'error' ;

export type MTBVSCodeTaskStatus = 
    'good' |
    'corrupt' |
    'missing' |
    'needsTasks' ;

export interface MTBLocationStatus {
  homeError?: string ;
  homeWarning?: string ;
  customError?: string ;
  customWarning?: string ;
}

export interface SettingsError {
  setting: string ;
  message: string ;
} ;


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
    request: FrontEndToBackEndType ;
    data: any ;
}

export interface BackEndToFrontEndResponse {
    response: BackEndToFrontEndType ;
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
  toolsdir: string;
  vscodeTasksStatus: MTBVSCodeTaskStatus ;
  needVSCode: boolean ;
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
    displayName: string ;
    owner: 'modus' | 'extension' | 'workspace' ;
    type: 'string' | 'number' | 'boolean' | 'choice' | 'uri' | 'dirpath' | 'filepath' | 'toolspath' ;
    value: string | number | boolean ;
    choices? : string[] ;
    description: string ;
    disabledMessage? : string ;
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
    versions: any[] ;
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

export interface BrowseResult {
  tag: string ;
  path: string ;
}