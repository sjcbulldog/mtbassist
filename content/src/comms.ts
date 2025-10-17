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
    'runTask' |
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
    'fix-settings' |
    'memory-data' |
    'prepareVSCode' |
    'password' | 
    'refreshApp' |
    'install-llvm' |
    'llvm-versions' |
    'set-config' |
    'operation-status-closed' |
    'run-task' |
    'install-idc-service'
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
    'buildDone' | 
    'getPassword' |
    'memoryUsage' |
    'installLLVM' |
    'installLLVMMessage' |
    'startOperation' |
    'finishOperation' |
    'addStatusLine' |
    'tasksAvailable' |
    'lcsGuide' |
    'lcsKeywordAliases' |
    'gitState'
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

export type MTBVSCodeSettingsStatus =
    'good' |
    'corrupt' |
    'missing' |
    'needsSettings' ;

export interface InstallLLVMProgressMsg {
  error: boolean ;
  messages: string[] ;
}

export interface InstallLLVMData {
  enabled: boolean ;
  versions: string[] ;
}

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
  readme: string ;
  toolsdir: string;
  vscodeTasksStatus: MTBVSCodeTaskStatus ;
  vscodeSettingsStatus: MTBVSCodeSettingsStatus ;
  needVSCode: boolean ;
  documentation: Documentation[];
  middleware: Middleware[];
  projects: Project[];
  tools: Tool[];
  configuration: string ;
  generalMessage? : string ;
  generalMessageButtonText? : string ;
  generalMessageRequest? : FrontEndToBackEndType ;
  generalMessageHelp? : string ;
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
    tip?: string ;
    choices? : string[] ;
    tips?: string[] ;
    mapping? : { [key: string]: string } ;
    description: string ;
    disabledMessage? : string ;
    hidden?: boolean ;
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

export interface MemoryUsageSegment {
  start: number ;
  size: number ;
  fsize: number ;
  sections: string[] ;
  type: 'virtual' | 'physical' | 'virtual/physical' | 'unused';
}

export interface MemoryUsageData {
  name: string ;
  start: number ;
  size: number ;
  percent: number ;
  segments: MemoryUsageSegment[] ;
}

export interface MTBAssistantTask {
  description: string ;
  vscodecmd: string ;
  args: string[] ;
}

export interface LCSBSPKeywordAliases {
  keyword: string ;
  bsps: string[] ;
}

export interface CreateProjectGitState {
  id: number ;
  target: string ;
  operation?: string ;
  percent: number ;
  done: boolean ;
  error: boolean ;
}

export type ProjectGitStateTrackerData = Array<CreateProjectGitState> ;
