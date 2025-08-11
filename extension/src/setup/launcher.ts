import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path' ;
import * as exec from 'child_process' ;
import * as os from 'os';
import EventEmitter = require("events");
import { ModusToolboxEnvironment } from '../mtbenv';

export class IDCLauncher extends EventEmitter{
    private static readonly launcherPartialPath = ['Infineon', 'LauncherService', 'idc-launcher-service'] ;

    private logger_ : winston.Logger ;
    private path_? : string ;
    private foundLauncher_ : boolean = false ;

    constructor(logger: winston.Logger) {
        super() ;
        this.logger_ = logger;
        this.path_ = this.findLauncherExecutable();
    }

    public get found(): boolean {
        return this.foundLauncher_;
    }

    public start() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (!this.path_) {
                this.foundLauncher_ = false ;
                this.logger_.error('Launcher executable not found - cannot start IDC service.');
                resolve() ;
            }

            this.foundLauncher_ = true;
            let ls = exec.spawn(this.path_!, [], 
                {
                    cwd: os.homedir(),
                    detached: true,
                }) ;

            resolve() ;

        }) ;
        return ret ;
    }

    public get isIDCServiceRunning(): boolean {
        return false ;
    }

    public run(args: string[], cb? : (lines: string[]) => void, id?: any) : Promise<string | undefined> {
        let ret = new Promise<string | undefined>((resolve, reject) => {
            if (!this.path_) {
                this.logger_.error('Cannot run IDC Launcher - launcher executable not found.');
                resolve(undefined);
                return;
            }

            ModusToolboxEnvironment.runCmdCaptureOutput(os.homedir(), this.path_!, args, cb, id)
            .then((result) => {
                if (result[0] !== 0) {
                    this.logger_.error(`IDC Launcher failed with exit code ${result[0]}`);
                    resolve(undefined);
                    return;
                }
                let output: string = '' ;
                for(let line of result[1]) {
                    output += line + '\n' ;
                }
                resolve(output) ;
            })
            .catch((error) => {
                this.logger_.error(`Error running IDC Launcher: ${error.message}`);
                resolve(undefined) ;
            });
        }) ;
        return ret ;
    }

    private getSystemDriveWindow() {
        return "C:\\" ;
    }

    private checkPossiblePath(p: string): string | undefined {
        if (process.platform === 'win32') {
            p += '.exe' ;
        }

        if (!fs.existsSync(p)) {
            return undefined ;
        }

        return p ;
    }

    private findLauncherExecutable() : string | undefined {
        let launcherPath : string | undefined = undefined;
        let homedir = os.homedir();
        launcherPath = this.checkPossiblePath(path.join(homedir, ...IDCLauncher.launcherPartialPath)) ;
        if (!launcherPath) {
            if (process.platform === 'win32') {
                launcherPath = this.checkPossiblePath(path.join(this.getSystemDriveWindow(), ...IDCLauncher.launcherPartialPath)) ;
            }
            else if (process.platform === 'linux') {
                launcherPath = this.checkPossiblePath(path.join('/opt', 'Infineon', 'LauncherService', 'idc-launcher-service')) ;
            }
            else {
                launcherPath = this.checkPossiblePath(path.join('/usr', 'local', 'Infineon', 'LauncherService', 'idc-launcher-service')) ;
            }
        }

        return launcherPath;
    }    
}