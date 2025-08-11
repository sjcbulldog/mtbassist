import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path' ;
import * as exec from 'child_process' ;
import * as os from 'os'; ;

export class IDCLauncher {
    private static readonly launcherPartialPath = ['Infineon', 'LauncherService', 'idc-launcher-service'] ;

    private logger_ : winston.Logger ;
    private path_? : string ;
    private foundLauncher_ : boolean = false ;

    constructor(logger: winston.Logger) {
        this.logger_ = logger;
    }

    public get found(): boolean {
        return this.foundLauncher_;
    }

    public start() : Promise<string | undefined> {
        let ret = new Promise<string | undefined>((resolve, reject) => {
            this.path_ = this.findLauncherExecutable();
            if (!this.path_) {
                this.foundLauncher_ = false ;
                this.logger_.error('Launcher executable not found - cannot start IDC service.');
                resolve(undefined) ;
            }

            this.foundLauncher_ = true;
            this.run([])
            .then((result) => {
                resolve(result) ;
            })
            .catch((err) => {
                reject(err) ;
            }) ;
        }) ;
        return ret ;
    }

    public run(args: string[]) : Promise<string | undefined> {
        let ret = new Promise<string | undefined>((resolve, reject) => {
            if (!this.path_) {
                this.logger_.error('Cannot run IDC Launcher - launcher executable not found.');
                resolve(undefined);
                return;
            }

            let result = 
            exec.execFile(this.path_!, args, { cwd: os.homedir() }, (error, stdout, stderr) => {
                if (error) {
                    this.logger_.error(`Error running IDC Launcher: ${error.message}`);
                    resolve(undefined) ;
                }

                resolve(stdout) ;
            }) ;
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