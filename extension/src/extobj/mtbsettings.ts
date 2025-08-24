import { MTBSetting } from "../comms";
import { MTBAssistObject } from "./mtbassistobj";
import * as path from 'path' ;
import * as os from 'os' ;
import * as fs from 'fs' ;
import EventEmitter = require("events");
import { ModusToolboxEnvironment } from "../mtbenv";
import { MTBUtils } from "../mtbenv/misc/mtbutils";

export class MTBSettings extends EventEmitter {
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
            value: 'Online Mode',
            choices: ['Online Mode', 'Local Content Mode'],
            description: 'The operating mode for ModusToolbox.  This determines how the tool interacts with the file system and network resources.  Online Mode dynamically retrieves content from the internet, while Local Content Mode uses only locally available content.'
        },
    ] ;

    private settings_: MTBSetting[];
    private ext_: MTBAssistObject ;

    constructor(ext: MTBAssistObject) {
        super();
        this.settings_ = MTBSettings.defaultSettings ;
        this.ext_ = ext;

        this.readSettingsFile() ;
        this.readWorkspaceSettings() ;
        this.resolvePaths() ;
    }

    public get toolsPath() : string {
        return this.computeToolsPath() ;
    }

    public get settings(): MTBSetting[] {
        this.updateEAPChoices() ;
        this.updateToolPathChoices() ;
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
                if (this.customPathOK(p)) {
                    this.emit('toolsPathChanged', p) ;
                }
            }
            else if (setting.name === 'operating_mode') {
                if (!this.ext_.lcsMgr || !this.ext_.lcsMgr.isLCSReady && setting.value === 'Local Content Mode') {
                    // We don't have a valid ESP setup - refuse to change the setting and tell the user
                    this.emit('showError', setting.name, 'The local content storeage has not been initialized.  See the LCS tab to initialize LCS content') ;
                }
                else {
                    this.writeWorkspaceSettings() ;
                    this.emit('restartWorkspace', this.computeToolsPath()) ;
                }
            }
            else {
                this.writeSettingsFile() ;
                if (setting.name === 'enabled_eap') {
                    this.emit('toolsPathChanged', this.computeToolsPath()) ;
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
        let tdir: string = '' ;
        let versetting = this.settings_.find(s => s.name === 'toolsversion');
        if (versetting) {
            if (versetting.value !== 'Custom') {
                tdir = this.versionToToolsDir(versetting.value as string);
            }
            else {
                let cuspath = this.settings_.find(s => s.name === 'custompath');
                if (cuspath) {
                    tdir = cuspath.value as string ;
                }
            }
        }

        if (tdir === '') {
            let tools = ModusToolboxEnvironment.findToolsDirectories().sort() ; 
            if (tools.length > 0) {
                tdir = tools[tools.length - 1];
            }
        }

        tdir = tdir.replace(/\\/g,'/');
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

    private versionToToolsDir(ver: string) : string {
        let ret = ver ;

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
                    for(let setting of this.settings_) {
                        if (data.mtb[setting.name] !== undefined) {
                            setting.value = data.mtb[setting.name];
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

        for(let setting of this.settings_) {
            if (setting.name === 'enabled_eap') {
                setting.choices = eapChoices;
                if (eapChoices.length > 0 && !eapChoices.includes(setting.value as string)) {
                    setting.value = eapChoices[0]; // Default to first EAP if current is not valid
                }
            }
        }
    }

    private toolDirToVersion(tdir: string) : string {
        let hdir = MTBUtils.getCommonInstallLocation() ;
        if (!hdir) {
            return tdir ;
        }
        
        hdir = hdir.replace(/\\/g,'/');
        let ret = tdir ;
        if (hdir && tdir.startsWith(hdir)) {
            if (tdir.includes('3.2')) {
                ret = 'ModusToolbox 3.2';
            } else if (tdir.includes('3.3')) {
                ret = 'ModusToolbox 3.3';
            } else if (tdir.includes('3.4')) {
                ret = 'ModusToolbox 3.4';
            } else if (tdir.includes('3.5')) {
                ret = 'ModusToolbox 3.5';
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
}