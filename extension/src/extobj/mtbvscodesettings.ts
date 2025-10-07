import { ModusToolboxEnvironment } from "../mtbenv";
import * as fs from 'fs' ;
import * as winston from 'winston';
import { MTBVSCodeSettingsStatus } from "../comms";
import { MTBAssistObject } from "./mtbassistobj";

export class MTBVSCodeSettings {

    private static readonly openocdGUID = 'c0688bed-ec45-4dab-9521-10f5283a6ead' ;
    private static readonly gccGUID = '8472a194-a4ec-4c1b-bfda-b6fca90b3f0d' ;

    private ext_: MTBAssistObject ;
    private status_ : MTBVSCodeSettingsStatus = 'missing' ;
    private settings_ : any = {} ;

    constructor(ext: MTBAssistObject,) {
        this.ext_ = ext ;
    }

    public get status() : MTBVSCodeSettingsStatus {
        this.processAllSettingsFile() ;
        return this.status_ ;
    }

    public fix() : void {
        for(let file of this.getAllSettingsFiles()) {
            this.fixSettingsFile(file) ;
        }
    }

    private getAllSettingsFiles() : string[] {
        let ret : string[] = [] ;
        if (this.ext_.env!.appInfo) {
            let setfile = `${this.ext_.env!.appInfo.appdir}/.vscode/settings.json` ;
            ret.push(setfile) ;

            for(let proj of this.ext_.env!.appInfo.projects) {
                let setfile = `${proj.path}/.vscode/settings.json` ;
                ret.push(setfile) ;
            }
        }
        return ret ;
    }

    private fixSettingsFile(filename: string) {
        let dir = this.ext_.toolsDir ;
        this.settings_['modustoolbox.toolsPath'] = dir ;

        let tool = this.ext_.env!.toolsDB.findToolByGUID(MTBVSCodeSettings.openocdGUID) ;
        if (tool) {
            dir = tool.path ;
            this.settings_['cortex-debug.openocdPath'] = dir ;
        }

        tool = this.ext_.env!.toolsDB.findToolByGUID(MTBVSCodeSettings.gccGUID) ;
        if (tool) {
            dir = tool.path ;
            this.settings_['cortex-debug.gccPath'] = dir ;
        }

        fs.writeFileSync(filename, JSON.stringify(this.settings_, null, 4), 'utf8') ;
        this.ext_.logger.info(`VS Code settings updated in ${filename}`) ;
        this.processAllSettingsFile() ;
    }

    private processAllSettingsFile() {
        this.status_ = 'good' ;
        for(let file of this.getAllSettingsFiles()) {
            let stat = this.processSettingsFile(file) ;
            if (stat !== 'good') {
                this.status_ = stat ;
                return ;
            }
        }
    }

    private processSettingsFile(filename: string) : MTBVSCodeSettingsStatus {
        let ret = 'missing' as MTBVSCodeSettingsStatus ;
        if (fs.existsSync(filename)) {
            let data = fs.readFileSync(filename, 'utf8') ;
            try {
                data = data.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
                this.settings_ = JSON.parse(data) ;
                let dir = this.ext_.env!.toolsDir ;
                if (!dir) {
                    return 'missing' ;
                }

                if (!this.checkSetting('modustoolbox.toolsPath', dir)) {
                    return 'needsSettings' ;
                }

                let tool = this.ext_.env!.toolsDB.findToolByGUID(MTBVSCodeSettings.openocdGUID) ;
                if (!tool) {
                    // Should not happen
                    return 'missing' ;
                }

                dir = tool.path ;
                if (!this.checkSetting('cortex-debug.openocdPath', dir)) {
                    return 'needsSettings' ;
                }

                tool = this.ext_.env!.toolsDB.findToolByGUID(MTBVSCodeSettings.gccGUID) ;
                if (!tool) {
                    // Should not happen
                    return 'missing' ;
                }
                dir = tool.path ;
                if (!this.checkSetting('cortex-debug.gccPath', dir)) {
                    return 'needsSettings' ;
                }

                ret = 'good' ;

            }
            catch (e) {
                this.ext_.logger.error(e) ;
                ret = 'corrupt' ;
            }
        }
        return ret ;
    }

    private checkSetting(name: string, value: string) : boolean {
        if (this.settings_.hasOwnProperty(name)) {
            if (this.settings_[name] === value) {
                return true ;
            }
        }
        return false ;
    }
}