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
import { MTBUtils } from "../mtbenv/misc/mtbutils";
import * as path from 'path' ;
import * as os from 'os' ;
import * as fs from 'fs' ;

export class MTBSettings extends EventEmitter {
    public static operatingModeOnline = 'direct' ;
    public static operatingModeLocalContent = 'local' ;

    private static defaultSettings : MTBSetting[] = [
        {
            name: 'toolsversion',
            displayName: 'Tools Version',
            owner: 'workspace',
            type: 'choice',
            choices: [],
            value: '',
            description: 'The version of ModusToolbox to use if using a version in a standard location.'
        },
        {
            name: 'custompath',
            displayName: 'Custom Tools Path',
            owner: 'workspace',
            type: 'dirpath',
            value: '',
            description: `The location of ModusToolbox if it is located in a custom location.  This is only used if the Tools Version setting is 'Custom'.`
        },
        {
            name: 'enabled_eap',
            displayName: 'Early Access Pack',
            owner: 'modus',
            type: 'choice',
            choices: [],                // Choices will be injected at runtime
            value: '',
            description: 'This is the early access pack that is enabled for the current user.  This is a global settings and will apply to all ModusToolbox application.'
        },
        {
            name: 'global_path',
            displayName: 'Global Storage Path',
            owner: 'modus',
            type: 'dirpath',
            value: '~/.modustoolbox/global',
            description: 'This is the path to the global storage location.  This location is shared across all ModusToolboxcl applications.'
        },
        {
            name: 'information_level',
            displayName: 'Information Level',
            owner: 'modus',
            type: 'choice',
            value: 'low',
            choices: ['low', 'medium', 'high'],
            description: 'The amount of information displayed in ModusToolbox applications'
        },
        {
            name: 'lcs_path',
            displayName: 'Local Content Storage Path',
            owner: 'modus',
            type: 'dirpath',
            value: '~/.modustoolbox/lcs',
            description: 'The path for storing local content when working without an internet connection'
        },
        {
            name: 'manifest_loc_path',
            displayName: 'Local Manifest File Path',
            owner: 'modus',
            type: 'filepath',
            value: '~/.modustoolbox/manifest.loc',
            description: 'The path to the local manifest file that can be used to add additional content into ModusToolbox.'
        },
        {
            name: 'manifestdb_system_url',
            displayName: 'Manifest Database System URL',
            owner: 'modus',
            type: 'uri',
            value: '',
            description: 'The URL for top level super manifest containing ModusToolbox content.  This should generally left empty unless you are using an alternate set of manifest files due to internet restrictions.'
        },
        {
            name: 'operating_mode',
            displayName: 'Operating Mode',
            owner: 'modus',
            type: 'choice',
            value: 'direct',
            choices: ['direct', 'local'],
            mapping: { 'direct': 'Online Mode', 'local': 'Local Content Mode' },
            description: 'The operating mode for ModusToolbox.  This determines how the tool interacts with the file system and network resources.  Online Mode dynamically retrieves content from the internet, while Local Content Mode uses only locally available content.'
        },
    ] ;

    private settings_: MTBSetting[];
    private extra_ : Map<string, any> = new Map<string, any>() ;
    private ext_: MTBAssistObject ;

    constructor(ext: MTBAssistObject) {
        super();
        this.settings_ = MTBSettings.defaultSettings ;
        this.ext_ = ext;

        this.readSettingsFile() ;
        this.readWorkspaceSettings() ;
        this.sanitizeSettings() ;
        this.resolvePaths() ;
    }

    public get toolsPath() : string | undefined {
        return this.computeToolsPath() ;
    }

    public set toolsPath(p: string | undefined) {
        if (p) {
            this.settings_.find(s => s.name === 'toolsversion')!.value = 'Custom';
            this.settings_.find(s => s.name === 'custompath')!.value = p;
            this.writeWorkspaceSettings() ;
        }
    }

    public get settings(): MTBSetting[] {
        this.updateEAPChoices() ;
        this.updateToolPathChoices() ;
        this.checkLCSandEAP() ;
        return this.settings_;
    }

    public settingByName(name: string) : MTBSetting | undefined {
        return this.settings_.find(s => s.name === name);
    }

    public update(setting: MTBSetting) {
        let index = this.settings.findIndex(s => s.name === setting.name);
        if (index !== -1) {
            this.settings[index].value = setting.value;            
            if (setting.name === 'toolsversion') {
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
                    // We don't have a valid ESP setup - refuse to change the setting and tell the user
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
            else {
                this.writeSettingsFile() ;
                if (setting.name === 'enabled_eap') {
                    this.emit('refresh') ;                    
                    this.emit('toolsPathChanged', this.computeToolsPath()) ;
                }
            }
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

    private computeToolsPath() : string | undefined {
        let tdir: undefined | string = '' ;
        let custom = true ;
        let versetting = this.settings_.find(s => s.name === 'toolsversion');
        let cuspath = this.settings_.find(s => s.name === 'custompath');

        if (versetting) {
            if (versetting.value !== 'Custom') {
                tdir = this.versionToToolsDir(versetting.value as string);
                custom = false ;
            }
            else {

                if (cuspath && fs.existsSync(cuspath.value as string)) {
                    tdir = cuspath.value as string ;
                }
            }
        }

        if (tdir === '' || tdir === undefined) {
            let tools = ModusToolboxEnvironment.findToolsDirectories().sort() ; 
            if (tools.length > 0) {
                tdir = tools[tools.length - 1];
                custom = false ;
            }
        }

        if (tdir) {
            tdir = tdir.replace(/\\/g,'/');
            if (!custom) {
                versetting!.value = this.toolDirToVersion(tdir) ;
                cuspath!.value = '' ;
            }            
            else {
                versetting!.value = 'Custom' ;
                cuspath!.value = tdir ;
            }

            this.writeWorkspaceSettings() ;
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

    private versionToToolsDir(ver: string) : string | undefined {
        let ret = undefined ;

        if (ver.startsWith('ModusToolbox ')) {
            ver = ver.substring('ModusToolbox '.length);
            let tools = ModusToolboxEnvironment.findToolsDirectories();
            for(let stdplaces of tools) {
                if (stdplaces.includes(ver)) {
                    ret = stdplaces;
                    break;
                }
            }
        }
        return ret ;
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
        for(let setting of this.settings_) {
            if (setting.owner === 'workspace') {
                setting.value = this.ext_.context.workspaceState.get(setting.name, setting.value);
            }
        }
    }

    private writeWorkspaceSettings() : void {
        for(let setting of this.settings_) {
            if (setting.owner === 'workspace') {
                this.ext_.context.workspaceState.update(setting.name, setting.value);
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

    private updateEAPChoices() : void {
        let eapChoices: string[] = [];
        eapChoices.push('None') ;
        if (this.ext_.env?.packDB) {
            for (let packs of this.ext_.env.packDB.eaps) {
                eapChoices.push(packs.featureId);
            }
        }

        let setting = this.settings_.find(s => s.name === 'enabled_eap');
        if (setting) {
            setting.choices = eapChoices;
            if (eapChoices.length > 0 && !eapChoices.includes(setting.value as string)) {
                setting.value = eapChoices[0]; // Default to first EAP if current is not valid
            }
        }
    }

    private toolDirToVersion(tdir: string) : string {
        let rege = /^tools_([0-9]+.[0-9]+).*$/ ;
        let hdir = MTBUtils.getCommonInstallLocation() ;
        if (hdir.length === 0) {
            return tdir ;
        }
        
        let ret = tdir ;
        for(let h of hdir) {
            h = h.replace(/\\/g,'/');
            if (h && tdir.startsWith(h)) {

                let m = rege.exec(tdir.substring(h.length + 1)) ;
                if (m && m.length > 1) {
                    ret = 'ModusToolbox ' + m[1] ;
                    break ;
                }
            }
        }
        return ret ;
    }

    private updateToolPathChoices() : void {
        let tools = ModusToolboxEnvironment.findToolsDirectories();   
        let choices: string[] = [];
        for (let tool of tools) {
            let fixtool = tool.replace(/\\/g,'/');
            choices.push(this.toolDirToVersion(fixtool));
        }
        choices.push('Custom') ;
        let setting = this.settings_.find(s => s.name === 'toolsversion');
        if (setting) {
            setting.choices = choices;
        }
    }

    private checkLCSandEAP() : void {
        let opmode = this.settings_.find(s => s.name === 'operating_mode');
        let eap = this.settings_.find(s => s.name === 'enabled_eap');

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
}
