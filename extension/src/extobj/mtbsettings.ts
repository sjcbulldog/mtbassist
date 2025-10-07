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

import { MTBSetting } from "../comms";
import { MTBAssistObject } from "./mtbassistobj";

import EventEmitter = require("events");
import { ModusToolboxEnvironment } from "../mtbenv";
import * as path from 'path' ;
import * as os from 'os' ;
import * as fs from 'fs' ;
import * as vscode from 'vscode';

export class MTBSettings extends EventEmitter {
    public static operatingModeOnline = 'direct' ;
    public static operatingModeLocalContent = 'local' ;
    public static perProject = 'Per Project' ;
    private static defaultManifestURL = '' ;    
    private static chinaManifestURL = 'https://mtbgit.infineon.cn/raw/Infineon/mtb-super-manifest/main/mtb-super-manifest-fv2-mirror.xml' ;
    private static chinaGitInsteadof = 'https://mtbgit.infineon.cn/raw/Infineon/mtb-super-manifest/main/mtb-super-manifest-fv2-mirror.xml|https://github.com|https://mtbgit.infineon.cn' ;

    private static defaultSettings : MTBSetting[] = [
        {
            name: 'toolsversion',
            displayName: 'Tools Version',
            owner: 'workspace',
            type: 'choice',
            choices: [],
            value: '',
            description: 'The version of ModusToolbox to use if using a version in a standard location. (Workspace scope: applies only to this open workspace)'
        },
        {
            name: 'custompath',
            displayName: 'Custom Tools Path',
            owner: 'workspace',
            type: 'dirpath',
            value: '',
            description: `The location of ModusToolbox if it is located in a custom location.  This is only used if the Tools Version setting is 'Custom'. (Workspace scope: applies only to this open workspace)`
        },
        {
            name: 'configuration',
            displayName: 'Configuration',
            owner: 'workspace',
            type: 'choice',
            choices: [ 'Debug', 'Release', MTBSettings.perProject],
            value: 'Debug',
            description: 'This is the configuration to use when building the application. (Workspace scope: applies only to this open workspace)'
        },           
        {
            name: 'toolchain',
            displayName: 'Toolchain',
            owner: 'workspace',
            type: 'choice',
            choices: [ 'GCC_ARM', 'ARM', 'IAR', 'LLVM_ARM', MTBSettings.perProject
            ],
            value: 'GCC_ARM',
            description: 'This is the toolchain to use when building the application. (Workspace scope: applies only to this open workspace)'
        },   
        {
            name: 'gccpath',
            displayName: 'GCC Compiler Path',
            owner: 'extension',
            type: 'dirpath',
            value: '',
            description: `The location of the GCC compiler installation. If this path is empty, the default GCC installation will be used. (Extension scope: applies globally)`
        },
        {
            name: 'llvmpath',
            displayName: 'LLVM Compiler Path',
            owner: 'extension',
            type: 'dirpath',
            value: '',
            description: `The location of the ARM LLVM compiler installation. (Extension scope: applies globally)`
        },
        {
            name: 'iarpath',
            displayName: 'IAR Compiler Path',
            owner: 'extension',
            type: 'dirpath',
            value: '',
            description: `The location of the IAR compiler installation. If this path is empty, ModusToolbox will attempt to find the IAR compiler in standard installation directories. (Extension scope: applies globally)`
        },
        {
            name: 'armccpath',
            displayName: 'ARM Compiler Path',
            owner: 'extension',
            type: 'dirpath',
            value: '',
            description: `The location of the ARM Compiler installation. (Extension scope: applies globally)`
        },
        {
            name: 'enabled_eap',
            displayName: 'Early Access Pack',
            owner: 'modus',
            type: 'choice',
            choices: [],                // Choices will be injected at runtime
            value: '',
            description: 'This is the early access pack that is enabled for the current user. (Global scope: applies globally)'
        },
        {
            name: 'global_path',
            displayName: 'Global Storage Path',
            owner: 'modus',
            type: 'dirpath',
            value: '~/.modustoolbox/global',
            description: 'This is the path to the global storage location.  This location is shared across all ModusToolbox applications. (Global scope: applies globally)'
        },
        {
            name: 'information_level',
            displayName: 'Information Level',
            owner: 'modus',
            type: 'choice',
            value: 'low',
            choices: ['low', 'medium', 'high'],
            description: 'The amount of information displayed in ModusToolbox applications. (Global scope: applies globally)'
        },
        {
            name: 'lcs_path',
            displayName: 'Local Content Storage Path',
            owner: 'modus',
            type: 'dirpath',
            value: '~/.modustoolbox/lcs',
            description: 'The path for storing local content when working without an internet connection. (Global scope: applies globally)'
        },
        {
            name: 'manifest_loc_path',
            displayName: 'Local Manifest File Path',
            owner: 'modus',
            type: 'filepath',
            value: '~/.modustoolbox/manifest.loc',
            description: 'The path to the local manifest file that can be used to add additional content into ModusToolbox. (Global scope: applies globally)'
        },
        {
            name: 'manifestdb_url_mode',
            displayName: 'Manifest Database URL Mode',
            owner: 'extension',
            type: 'choice',
            choices: ['default', 'china', 'custom'],
            mapping: { 'default': 'Default', 'china': 'China', 'custom': 'Custom' },
            value: 'default',
            description: 'The mode for selecting the Manifest Database System URL. "default" uses the standard URL, "china" uses a URL optimized for users in China, and "custom" allows you to specify your own URL in the Manifest Database System URL setting.'
        },
        {
            name: 'manifestdb_system_url',
            displayName: 'Manifest Database System URL',
            owner: 'modus',
            type: 'uri',
            value: '',
            description: 'The URL for top level super manifest containing ModusToolbox content. This should generally left empty unless you are using an alternate set of manifest files due to internet restrictions. (Global scope: applies globally)'
        },
        {
            name: 'git_insteadof',
            displayName: 'Git Insteadof',
            owner: 'modus',
            type: 'string',
            value: '',
            description: 'This setting allows you to specify a git url substitution.  This is useful if you need to use a different protocol or server to access git repositories.',
            hidden: true
        },
        {
            name: 'operating_mode',
            displayName: 'Operating Mode',
            owner: 'modus',
            type: 'choice',
            value: 'direct',
            choices: ['direct', 'local'],
            mapping: { 'direct': 'Online Mode', 'local': 'Local Content Mode' },
            description: 'The operating mode for ModusToolbox. This determines how the tool interacts with the file system and network resources. Online Mode dynamically retrieves content from the internet, while Local Content Mode uses only locally available content. (Global scope: applies globally)'
        },
        {
            name: 'proxy_mode', 
            displayName: 'Proxy Mode',
            owner: 'modus',
            type: 'choice',
            value: 'none',
            choices: ['manual', 'direct'],
            mapping: { 'manual': 'Manual Proxy', 'direct': 'No Proxy' },
            description: 'The proxy mode for network connections. (Global scope: applies globally)'
        },
        {
            name: 'proxy_server',
            displayName: 'Proxy Server',
            owner: 'modus',
            type: 'string',
            value: '',
            description: 'The proxy server to use for network connections. This should be in the format http://username:password@proxyserver:port if authentication is required, or http://proxyserver:port if no authentication is needed. Leave empty to not use a proxy server. (Global scope: applies globally)'
        }
    ] ;

    private settings_: MTBSetting[];
    private extra_ : Map<string, any> = new Map<string, any>() ;
    private ext_: MTBAssistObject ;
    private alltools_ : string[] = [] ;

    constructor(ext: MTBAssistObject) {
        super();
        this.settings_ = MTBSettings.defaultSettings ;
        this.ext_ = ext;

        this.readSettingsFile() ;
        this.readWorkspaceSettings() ;
        this.readExtensionSettings() ;
        this.sanitizeSettings() ;
        this.resolvePaths() ;

        this.alltools_ = this.ext_.getAllToolsPaths() ;
    }

    public get toolsPath() : string | undefined {
        return this.computeToolsPath() ;
    }

    public get hasLLVM() : boolean {
        let setting = this.settings_.find(s => s.name === 'llvmpath');
        if (setting && setting.value && fs.existsSync(setting.value as string)) {
            return true ;
        }

        return false ;
    }

    public set toolsPath(p: string | undefined) {
        if (p && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            if (this.alltools_.indexOf(p) !== -1) {
                this.settings_.find(s => s.name === 'toolsversion')!.value = p ;
                this.settings_.find(s => s.name === 'custompath')!.value = '';
            }
            else {
                this.settings_.find(s => s.name === 'toolsversion')!.value = 'Custom';
                this.settings_.find(s => s.name === 'custompath')!.value = p;
            }
            this.writeWorkspaceSettings() ;
        }
    }

    public set llvmPath(p: string) {
        this.settings_.find(s => s.name === 'llvmpath')!.value = p ;
        this.writeExtensionSettings() ;
        this.emit('refresh') ;               
    }

    public get configuration() : string {
        let setting = this.settings_.find(s => s.name === 'configuration');
        return setting ? String(setting.value || '') : '' ;
    }

    public set configuration(c: string) {
        let setting = this.settings_.find(s => s.name === 'configuration');
        if (setting) {
            setting.value = c;
            this.writeWorkspaceSettings();
            this.emit('updateTasks') ;
            this.emit('updateAppStatus', null) ;
            this.emit('refresh') ;               
        }
    }

    public get settings(): MTBSetting[] {
        let settings = JSON.parse(JSON.stringify(this.settings_)) as MTBSetting[] ;
        this.updateEAPChoices(settings) ;
        this.updateToolPathChoices(settings) ;
        this.checkLCSandEAP(settings) ;
        this.checkManifestURLMode(settings) ;
        return settings ;
    }

    public settingByName(name: string) : MTBSetting | undefined {
        return this.settings_.find(s => s.name === name);
    }

    public update(setting: MTBSetting) {
        let index = this.settings_.findIndex(s => s.name === setting.name);
        if (index !== -1) {
            this.settings_[index].value = setting.value;            
            if (setting.name === 'toolsversion') {
                if (setting.value !== 'Custom') {
                    let index = parseInt((setting.value as string).split(':')[0].trim()) - 1 ;
                    if (index >= 0 && index < this.alltools_.length) {
                        let tdir = this.alltools_[index] ;
                        this.settings_[index].value = tdir ;
                    }
                }
                this.writeWorkspaceSettings() ;
                this.emit('toolsPathChanged', this.computeToolsPath()) ;
            }
            else if (setting.name === 'custompath') {
                this.writeWorkspaceSettings() ;
                let p = this.computeToolsPath() ;
                if (p && this.customPathOK(p)) {
                    this.emit('toolsPathChanged', p) ;
                }
            }
            else if (setting.name === 'operating_mode') {
                if (!this.ext_.lcsMgr || !this.ext_.lcsMgr.isLCSReady && setting.value === 'Local Content Mode') {
                    this.settings[index].value = 'Online Mode';
                    this.emit('showError', setting.name, 'The local content storeage has not been initialized.  See the LCS tab to initialize LCS content') ;
                }
                else {
                    this.writeWorkspaceSettings() ;
                    this.writeSettingsFile() ;
                    this.emit('restartWorkspace', this.computeToolsPath()) ;
                }
                this.emit('refresh') ;
            }
            else if (setting.name === 'toolchain') {
                if (setting.value === 'LLVM_ARM') {
                    let llvmsetting = this.settingByName('llvmpath') ;
                    if(!llvmsetting || !llvmsetting.value || !fs.existsSync(llvmsetting.value as string)) {
                        this.emit('showError', setting.name, 'The LLVM toolchain was selected but the LLVM path is not set correctly.  Please update the LLVM path setting or the build will not be successful.') ;
                    }
                    else {
                        this.emit('updateTasks') ;
                        this.emit('showError', 'llvmpath', undefined) ;
                    }
                }
                else if (setting.value === 'ARM') {
                    let armsetting = this.settingByName('armccpath') ;
                    if(!armsetting || !armsetting.value || !fs.existsSync(armsetting.value as string)) {
                        this.emit('showError', setting.name, 'The ARM toolchain was selected but the ARM path is not set correctly.  Please update the ARM path setting before selecting the ARM toolchain.') ;
                    }
                    else {
                        this.emit('updateTasks') ;                        
                        this.emit('showError', 'armccpath', undefined) ;
                    }
                }
                else {
                    this.emit('updateTasks') ;                    
                    this.emit('showError', 'toolchain', undefined) ;
                }
                this.emit('updateTasks', null) ;
                this.writeWorkspaceSettings() ;
            }
            else if (setting.name === 'llvmpath') {
                if (setting.value && !fs.existsSync(setting.value as string)) {
                    this.emit('showError', setting.name, 'The LLVM path is not valid.  Please update the LLVM path setting before selecting the LLVM toolchain.') ;
                }
                else {
                    this.emit('showError', 'llvmpath', undefined) ;
                    this.emit('showError', 'toolchain', undefined) ;
                    this.emit('updateTasks', null) ;
                    this.writeExtensionSettings() ;
                }
            }
            else if (setting.name === 'gccpath') {
                this.emit('updateTasks', null) ;
                this.writeExtensionSettings() ;
            }
            else if (setting.name === 'iarpath') {
                this.emit('updateTasks', null) ;
                this.writeExtensionSettings() ;
            }
            else if (setting.name === 'armccpath') {
                if (setting.value && !fs.existsSync(setting.value as string)) {
                    this.emit('showError', setting.name, 'The ARM path is not valid.  Please update the ARM path setting before selecting the ARM toolchain.') ;
                }
                else {  
                    this.emit('showError', 'armccpath', undefined) ;
                    this.emit('showError', 'toolchain', undefined) ;
                    this.emit('updateTasks', null) ;
                    this.writeExtensionSettings() ;
                }
            }
            if (setting.name === 'manifestdb_url_mode') {
                if (setting.value === 'default') {
                    this.switchToDefaultManifest() ;
                }
                else if (setting.value === 'china') {
                    this.switchToChinaManifest() ;
                }
                else if (setting.value === 'custom') {
                    this.switchToCustomManifest() ;
                }
                this.writeSettingsFile() ;
                this.writeExtensionSettings() ;
                this.emit('refresh') ;
            }
            else if (setting.name === 'configuration') {
                this.writeWorkspaceSettings() ;
                this.emit('updateTasks') ;
                this.emit('updateAppStatus') ;
            }
            else {
                this.writeSettingsFile() ;
                this.writeExtensionSettings() ;
                this.writeWorkspaceSettings() ;
                if (setting.name === 'enabled_eap') {
                    this.emit('refresh') ;                    
                    this.emit('toolsPathChanged', this.computeToolsPath()) ;
                }
            }
        }
    }

    private switchToDefaultManifest() : void {
        let msetting = this.settings_.find(s => s.name === 'manifestdb_system_url');
        if (msetting) {
            msetting.value = MTBSettings.defaultManifestURL ;
        }

        let gsetting = this.settings_.find(s => s.name === 'git_insteadof');
        if (gsetting) {
            gsetting.value = '' ;
        }
        this.emit('refresh') ;        
    }

    private switchToChinaManifest() : void {    
        let msetting = this.settings_.find(s => s.name === 'manifestdb_system_url');
        if (msetting) {
            msetting.value = MTBSettings.chinaManifestURL ;
        }

        let gsetting = this.settings_.find(s => s.name === 'git_insteadof');
        if (gsetting) {
            gsetting.value = MTBSettings.chinaGitInsteadof ;
        }
        this.emit('refresh') ;
    }

    private switchToCustomManifest() : void {
        let gsetting = this.settings_.find(s => s.name === 'git_insteadof');
        if (gsetting) {
            gsetting.value = '' ;
        }
    }

    private sanitizeSettings() : void {
        let tver = this.settings_.find(s => s.name === 'toolsversion');
        let cpath = this.settings_.find(s => s.name === 'custompath');

        if (tver && tver.value === 'Custom') {
            if (!cpath) {
                tver.value = '' ;
            }
            else if (!fs.existsSync(cpath.value as string)) {
                tver.value = '' ;
                cpath.value = '' ;
            }
        }

        let toolchain = this.settings_.find(s => s.name === 'toolchain');
        if (toolchain) {
            if (toolchain.value === 'LLVM_ARM') {
                let llvmpath = this.settings_.find(s => s.name === 'llvmpath');
                if (!llvmpath || !llvmpath.value || !fs.existsSync(llvmpath.value as string)) {
                    this.emit('showError', 'llvmpath', 'The LLVM path is not valid.  Please update the LLVM path setting before selecting the LLVM toolchain.');
                }
            }
            else if (toolchain.value === 'ARM') {
                let armpath = this.settings_.find(s => s.name === 'armccpath');
                if (!armpath || !armpath.value || !fs.existsSync(armpath.value as string)) {
                    this.emit('showError', 'armccpath', 'The ARM path is not valid.  Please update the ARM path setting before selecting the ARM toolchain.');
                }
            }
        }
    }

    private customPathOK(p: string) : boolean {
        if (!fs.existsSync(p) || !fs.lstatSync(p).isDirectory()) {
            return false;
        }

        for(let contents of fs.readdirSync(p)) {
            if (/version-[0-9]+.[0-9]+.xml/.test(contents)) {
                return true;
            }
        }

        return false;
    }

    private computeToolsPath() : string {
        let tdir: undefined | string = '' ;
        let versetting = this.settings_.find(s => s.name === 'toolsversion');
        let cuspath = this.settings_.find(s => s.name === 'custompath');

        if (versetting && cuspath) {
            if (versetting.value === 'Custom') {
                if (fs.existsSync(cuspath.value as string)) {
                    tdir = cuspath.value as string ;
                }
            }
            else {
                if (versetting.value) {
                    let index = parseInt((versetting.value as string).split(':')[0].trim()) - 1 ;
                    if (!isNaN(index)) {
                        if (index >= 0 && index < this.alltools_.length) {
                            tdir = this.alltools_[index] ;
                        }   
                    }
                    else { 
                        let t = versetting.value as string ;
                        if (t && t.length > 0) {
                            tdir = t ;
                        }
                    }
                }
            }
        }
        return tdir ;
    }

    private resolvePath(p: string) {
        if (p.startsWith('~/')) {
            return path.join(os.homedir(), p.slice(2));
        }
        return p;
    }

    private resolvePaths() : void {
        for(let setting of this.settings_) {
            if (setting.type === 'dirpath' || setting.type === 'filepath') {
                setting.value = this.resolvePath(setting.value as string);
            }
        }
    }

    public checkToolsVersion() : boolean {
        let ret = false ;
        let setting = this.settings_.find(s => s.name === 'toolsversion');
        if (setting && !setting.value) {
            // There is no setting for tools version, we want to set it to the default
            // when we can.
            if (this.ext_.env?.defaultToolsDir) {
                setting.value = this.toolDirToVersion(this.ext_.env?.defaultToolsDir) ;
                this.writeWorkspaceSettings() ;
                ret = true ;
            }
        }
        return ret ;
    }

    private readWorkspaceSettings() {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            for(let setting of this.settings_) {
                if (setting.owner === 'workspace') {
                    setting.value = this.ext_.context.workspaceState.get(setting.name, setting.value);
                }
            }
        }
    }

    private writeWorkspaceSettings() : void {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            for(let setting of this.settings_) {
                if (setting.owner === 'workspace') {
                    this.ext_.context.workspaceState.update(setting.name, setting.value);
                }
            }
        }
    }

    private readExtensionSettings() : void {
        for(let setting of this.settings_) {
            if (setting.owner === 'extension') {
                setting.value = this.ext_.context.globalState.get(setting.name, setting.value);
            }
        }
    }

    private writeExtensionSettings() : void {
        for(let setting of this.settings_) {
            if (setting.owner === 'extension') {
                this.ext_.context.globalState.update(setting.name, setting.value);
            }
        }
    }

    private readSettingsFile() : void {
        let ret = false ;

        let settings = path.join(os.homedir(), '.modustoolbox', 'settings.json') ;
        if (fs.existsSync(settings)) {
            try {
                let data = JSON.parse(fs.readFileSync(settings, 'utf8')) ;
                if (data && data.mtb) {
                    for(let key of Object.keys(data.mtb)) {
                        let setting = this.settings_.find(s => s.name === key && s.owner === 'modus');
                        if (setting) {
                            setting.value = data.mtb[key];
                        }
                        else {
                            this.extra_.set(key, data.mtb[key]) ;
                        }
                    }
                }
            } catch (err) {
                this.ext_.logger.error('Error reading settings file:', err);
            }
        }
    }

    private writeSettingsFile() : void {
        let settings = path.join(os.homedir(), '.modustoolbox', 'settings.json') ;
        let data: any = {};
        for(let setting of this.settings_) {
            if (setting.owner === 'modus') {
                data[setting.name] = setting.value;
            }
        }

        for(let [key, value] of this.extra_) {
            data[key] = value ;
        }
        let contents = {
            mtb: data
        };
        fs.writeFileSync(settings, JSON.stringify(contents, null, 4));
    }

    private updateEAPChoices(settings: MTBSetting[]) : void {
        let eapChoices: string[] = [];
        eapChoices.push('None') ;
        if (this.ext_.env?.packDB) {
            for (let packs of this.ext_.env.packDB.eaps) {
                eapChoices.push(packs.featureId);
            }
        }

        let setting = settings.find(s => s.name === 'enabled_eap');
        if (setting) {
            setting.choices = eapChoices;
            if (eapChoices.length > 0 && !eapChoices.includes(setting.value as string)) {
                setting.value = eapChoices[0]; // Default to first EAP if current is not valid
            }
        }
    }

    private toolDirToVersion(tdir: string) : string {
        let rege = /^tools_([0-9]+.[0-9]+).*$/ ;

        let index = this.alltools_.indexOf(tdir) ;
        if (index !== -1) {
            let b = path.basename(tdir) ;
            let m = rege.exec(b) ;
            if (m && m.length > 1) {
                tdir = `${index + 1}: ModusToolbox ${m[1]}` ;
            }
        }
        return tdir ;
    }

    private updateToolPathChoices(settings: MTBSetting[]) : void {
        let choices: string[] = [];
        let tips: string[] = [];

        for (let tool of this.alltools_) {
            choices.push(this.toolDirToVersion(tool));
            tips.push(tool);
        }
        choices.push('Custom') ;
        tips.push('Specify a custom path to ModusToolbox');
        let setting = settings.find(s => s.name === 'toolsversion');
        if (setting) {
            setting.choices = choices;
            setting.tips = tips;
            if (setting.value !== 'Custom') {
                setting.value = this.toolDirToVersion(setting.value as string) ;
            }
        }
    }

    private checkLCSandEAP(settings: MTBSetting[]) : void {
        let opmode = settings.find(s => s.name === 'operating_mode');
        let eap = settings.find(s => s.name === 'enabled_eap');

        if (opmode && eap) {
            if (opmode.value === 'Local Content Mode' && eap.value !== 'None') {
                // This is an illegal state - favor the EAP
                opmode.value = 'Online Mode' ;
            }

            if (opmode.value === 'Local Content Mode') {
                eap.disabledMessage = 'This setting is not available in Local Content Mode.';
                opmode.disabledMessage = undefined ;
            } else if (eap.value !== 'None') {
                opmode.disabledMessage = 'This setting is not available when an Early Access Pack is seleced.';
                eap.disabledMessage = undefined;
            }
            else {
                opmode.disabledMessage = undefined;
                eap.disabledMessage = undefined;
            }
        }
    }

    private checkManifestURLMode(settings: MTBSetting[]) : void {
        let urlMode = settings.find(s => s.name === 'manifestdb_url_mode');
        let systemUrl = settings.find(s => s.name === 'manifestdb_system_url');

        if (urlMode && systemUrl) {
            if (urlMode.value === 'custom') {
                systemUrl.disabledMessage = undefined;
            } else {
                systemUrl.disabledMessage = 'This setting is only available when Manifest Database URL Mode is set to "custom".';
            }
        }
    }
}
