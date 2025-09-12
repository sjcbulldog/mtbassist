import { ModusToolboxEnvironment } from "../mtbenv";
import * as fs from 'fs' ;
import * as winston from 'winston';
import { MTBVSCodeSettingsStatus } from "../comms";

export class MTBVSCodeSettings {

    private static readonly openocdGUID = 'c0688bed-ec45-4dab-9521-10f5283a6ead' ;
    private static readonly gccGUID = '8472a194-a4ec-4c1b-bfda-b6fca90b3f0d' ;

    private env_: ModusToolboxEnvironment ;
    private filename_ : string ;
    private logger_ : winston.Logger ;
    private status_ : MTBVSCodeSettingsStatus = 'missing' ;
    private settings_ : any = {} ;

    constructor(env: ModusToolboxEnvironment, logger: winston.Logger, filename: string) {
        this.env_ = env ;
        this.logger_ = logger ;
        this.filename_ = filename ;
        this.processSettingsFile() ;
    }

    public get status() : MTBVSCodeSettingsStatus {
        this.processSettingsFile() ;
        return this.status_ ;
    }

    public fix() : void {
        let dir = this.env_.toolsDir ;
        this.settings_['modustoolbox.toolsPath'] = dir ;

        let tool = this.env_.toolsDB.findToolByGUID(MTBVSCodeSettings.openocdGUID) ;
        if (tool) {
            dir = tool.path ;
            this.settings_['cortex-debug.openocdPath'] = dir ;
        }

        tool = this.env_.toolsDB.findToolByGUID(MTBVSCodeSettings.gccGUID) ;
        if (tool) {
            dir = tool.path ;
            this.settings_['cortex-debug.gccPath'] = dir ;
        }

        fs.writeFileSync(this.filename_, JSON.stringify(this.settings_, null, 4), 'utf8') ;
        this.logger_.info(`VS Code settings updated in ${this.filename_}`) ;
        this.processSettingsFile() ;
    }

    private processSettingsFile() : void {
        if (fs.existsSync(this.filename_)) {
            let data = fs.readFileSync(this.filename_, 'utf8') ;
            try {
                data = data.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
                this.settings_ = JSON.parse(data) ;
                let dir = this.env_.toolsDir ;
                if (!dir) {
                    this.status_ = 'missing' ;
                    return ;
                }

                if (!this.checkSetting('modustoolbox.toolsPath', dir)) {
                    this.status_ = 'needsSettings' ;
                    return ;
                }

                let tool = this.env_.toolsDB.findToolByGUID(MTBVSCodeSettings.openocdGUID) ;
                if (!tool) {
                    // Should not happen
                    this.status_ = 'missing' ;
                    return ;
                }

                dir = tool.path ;
                if (!this.checkSetting('cortex-debug.openocdPath', dir)) {
                    this.status_ = 'needsSettings' ;
                    return ;
                }

                tool = this.env_.toolsDB.findToolByGUID(MTBVSCodeSettings.gccGUID) ;
                if (!tool) {
                    // Should not happen
                    this.status_ = 'missing' ;
                    return ;
                }
                dir = tool.path ;
                if (!this.checkSetting('cortex-debug.gccPath', dir)) {
                    this.status_ = 'needsSettings' ;
                    return ;
                }

                this.status_ = 'good' ;

            }
            catch (e) {
                this.status_ = 'missing' ;
                this.logger_.error(e) ;
                this.status_ = 'corrupt' ;
            }
        }
        else {
            this.status_ = 'missing' ;
            return ;
        }
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