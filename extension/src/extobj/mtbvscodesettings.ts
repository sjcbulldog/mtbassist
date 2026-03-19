import { ModusToolboxEnvironment } from "../mtbenv";
import * as fs from 'fs' ;
import * as winston from 'winston';
import { MTBVSCodeSettingsInfo, MTBVSCodeSettingsStatus } from "../comms";
import { MTBAssistObject } from "./mtbassistobj";
import path = require("path/posix");

export class MTBVSCodeSettings {

    private static readonly openocdGUID = 'c0688bed-ec45-4dab-9521-10f5283a6ead' ;
    private static readonly gccGUID = '8472a194-a4ec-4c1b-bfda-b6fca90b3f0d' ;
    private static readonly toolsPathSetting = 'modustoolbox.toolsPath' ;
    private static readonly gccPathSetting = 'cortex-debug.gccPath' ;
    private static readonly openocdPathSetting = 'cortex-debug.openocdPath' ;

    private ext_: MTBAssistObject ;
    private status_ : MTBVSCodeSettingsStatus = 'missing' ;
    private settings_ : any = {} ;
    private settingsDetails_: string[] = [] ;

    constructor(ext: MTBAssistObject,) {
        this.ext_ = ext ;
    }

    public get status() : MTBVSCodeSettingsInfo {
        this.processAllSettingsFile() ;
        return {
            status: this.status_,
            details: this.settingsDetails_
        } ;
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

    private genGCCPath() : string | undefined {
        let dir : string | undefined = undefined ;

        let tool = this.ext_.env!.toolsDB.findToolByGUID(MTBVSCodeSettings.gccGUID) ;
        if (tool) {
            dir = path.normalize(path.join(tool.path, 'bin')) ;
            dir = dir.replace(/\\/g, '/') ;
        }

        return dir ;
    }

    private openOCDPath() : string | undefined {
        let dir : string | undefined = undefined ;

        let tool = this.ext_.env!.toolsDB.findToolByGUID(MTBVSCodeSettings.openocdGUID) ;
        if (tool) {
            let pgm = tool.findProgramByUUID("72f061cf-f339-4181-a0be-1194062832c0") ;
            if (pgm) {
                dir = path.normalize(path.join(tool.path, pgm.exe)) ;
                if (process.platform === 'win32') {
                    dir = dir.replace(/\\/g, '/') ;
                    dir += '.exe' ;
                }
            }   
        }       
        
        return dir ;
    }

    private fixSettingsFile(filename: string) {
        let dir = this.ext_.toolsDir ;
        this.settings_[MTBVSCodeSettings.toolsPathSetting] = dir ;

        dir = this.openOCDPath() ;
        if (dir) {
            this.settings_[MTBVSCodeSettings.openocdPathSetting] = dir ;
        }

        dir = this.genGCCPath() ;
        if (dir) {
            this.settings_[MTBVSCodeSettings.gccPathSetting] = dir ;
        }

        fs.writeFileSync(filename, JSON.stringify(this.settings_, null, 4), 'utf8') ;
        this.ext_.logger.info(`VS Code settings updated in ${filename}`) ;
        this.processAllSettingsFile() ;
    }

    private processAllSettingsFile() {
        this.status_ = 'good' ;
        this.settingsDetails_ = [] ;
        for(let file of this.getAllSettingsFiles()) {
            let stat = this.processSettingsFile(file) ;
            if (stat !== 'good') {
                this.status_ = stat ;
                if (stat === 'corrupt' || stat === 'missing') {
                    this.settingsDetails_ = ['Regenerate the settings file'] ;
                }
                return ;
            }
        }
    }

    private processSettingsFile(filename: string) : MTBVSCodeSettingsStatus {
        let ret = 'good' as MTBVSCodeSettingsStatus ;
        if (fs.existsSync(filename)) {
            let data = fs.readFileSync(filename, 'utf8') ;
            try {
                data = data.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
                this.settings_ = JSON.parse(data) ;
                let dir = this.ext_.env!.toolsDir ;
                if (!dir) {
                    return 'missing' ;
                }

                let result = this.checkSetting(MTBVSCodeSettings.toolsPathSetting, dir) ;
                if (result !== 'match') {
                    this.addSettingDetail(MTBVSCodeSettings.toolsPathSetting, dir, result) ;
                    ret = 'needsSettings' ;
                }

                dir = this.openOCDPath() ;
                if (!dir) {
                    return 'missing' ;
                }
                result = this.checkSetting(MTBVSCodeSettings.openocdPathSetting, dir) ;
                if (result !== 'match') {
                    this.addSettingDetail(MTBVSCodeSettings.openocdPathSetting, dir, result) ;
                    ret = 'needsSettings' ;
                }

                dir = this.genGCCPath() ;
                if (!dir) {
                    return 'missing' ;
                }
                result = this.checkSetting(MTBVSCodeSettings.gccPathSetting, dir) ;
                if (result !== 'match') {
                    this.addSettingDetail(MTBVSCodeSettings.gccPathSetting, dir, result) ;
                    ret = 'needsSettings' ;
                }
            }
            catch (e) {
                this.ext_.logger.error(e) ;
                ret = 'corrupt' ;
            }
        }
        else {
            ret = 'missing' ;
        }
        return ret ;
    }

    private addSettingDetail(name: string, expected: string, result: 'add' | 'change') : void {
        if (result === 'add') {
            this.settingsDetails_.push(`Add '${name}' = '${expected}'`) ;
        } else {
            this.settingsDetails_.push(`Change '${name}' from '${this.settings_[name]}' to '${expected}'`) ;
        }
    }

    private checkSetting(name: string, value: string) : 'match' | 'add' | 'change' {
        if (this.settings_.hasOwnProperty(name)) {
            if (this.settings_[name] === value) {
                return 'match' ;
            }
            return 'change' ;
        }
        return 'add' ;
    }
}