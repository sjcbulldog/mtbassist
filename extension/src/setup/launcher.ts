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

import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path' ;
import * as exec from 'child_process' ;
import * as os from 'os';
import EventEmitter = require("events");
import { ModusToolboxEnvironment } from '../mtbenv';

//
// For windows
//   C:\Infineon\LauncherService\idc-launcher-service.exe
//   C:\Users\USERNAME\Infineon\LauncherService\idc-launcher-service.exe
//
// For linux
//   /opt/LauncherService/idc-launcher-service
//
// For macos
//  /Library/Infineon/LauncherService/idc-launcher-service.app/Contents/MacOS/idc-launcher-service
//  /Users/USERNAME/Library/Infineon/LauncherService/idc-launcher-service.app/Contents/MacOS/idc-launcher-service
//

export class IDCLauncher extends EventEmitter{
    private static readonly launcherPartialPath = ['Infineon', 'LauncherService', 'idc-launcher-service'] ;

    private logger_ : winston.Logger ;
    private path_? : string ;

    constructor(logger: winston.Logger) {
        super() ;
        this.logger_ = logger;
    }

    public get found(): boolean {
        if (!this.path_) {
            this.path_ = this.findLauncherExecutable() ;
        }
        return !!this.path_ ;
    }

    public start() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (!this.path_) {
                this.logger_.error('Launcher executable not found - cannot start IDC service.');
                resolve() ;
            }

            exec.spawn(this.path_!, [], 
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

            ModusToolboxEnvironment.runCmdCaptureOutput(os.homedir(), this.path_!, undefined, args, cb, id)
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

        if (process.platform === 'win32') {
            launcherPath = this.checkPossiblePath(path.join(homedir, ...IDCLauncher.launcherPartialPath)) ;
            if (!launcherPath) {
                launcherPath = this.checkPossiblePath(path.join(this.getSystemDriveWindow(), ...IDCLauncher.launcherPartialPath)) ;
            }
        }
        else if (process.platform === 'linux') {
            launcherPath = this.checkPossiblePath(path.join('/', 'opt', 'LauncherService', 'idc-launcher-service')) ;
        }
        else if (process.platform === 'darwin') {
            launcherPath = this.checkPossiblePath(path.join(homedir, 'Library', 'Infineon', 'LauncherService', 'idc-launcher-service.app')) ;
            if (!launcherPath) {
                launcherPath = this.checkPossiblePath(path.join('/', 'Library', 'Infineon', 'LauncherService', 'idc-launcher-service.app')) ;
            }

            if (launcherPath) {
                launcherPath = path.join(launcherPath!, 'Contents', 'MacOS', 'idc-launcher-service') ;
            }
        }
        else {
            throw new Error(`Unsupported platform: ${process.platform}`);
        }

        return launcherPath;
    }    
}