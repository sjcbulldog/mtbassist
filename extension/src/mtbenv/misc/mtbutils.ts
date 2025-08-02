import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os' ;
import * as exec from 'child_process' ;
import * as winston from 'winston';

export class MTBUtils {
    
    private static readonly name1 : string = 'Infineon_Technologies_AG' ;
    private static readonly name2 : string = 'Infineon-Toolbox' ;

    public static toolsRegex1 = /tools_([0-9]+)\.([0-9]+)/ ;
    public static toolsRegex2 = /tools_([0-9]+)\.([0-9]+)\.([0-9]+)/ ;

    public static removeValuesFromArray<T>(sourceArray: T[], valuesToRemove: T[]): T[] {
        return sourceArray.filter(item => !valuesToRemove.includes(item));
    }

    public static isValidUri(uri: string) {
        let ret = true ;

        try {
            let uriobj = new URL(uri) ;
        }
        catch(_) {
            ret = false ;
        }

        return ret;
    }

    public static isRootPath(pathToCheck: string): boolean {
        if (path.isAbsolute(pathToCheck)) {
            const root = path.parse(pathToCheck).root;
            return root === pathToCheck;
        }
        return false;
    }

    public static userInfineonDeveloperCenterRegistryDir() : string | undefined {
        let ret: string | undefined ;

        if (process.platform === "win32") {
            if (process.env.LOCALAPPDATA) {
                ret = path.join(process.env.LOCALAPPDATA, this.name1, this.name2) ;
            }
        } else if (process.platform === 'darwin') {
            if (process.env.HOME) {
                ret = path.join(process.env.HOME, 'Library', 'Application Support', this.name1, this.name2) ;
            }
        }
        else if (process.platform === 'linux') {
            if (process.env.HOME) {
                ret = path.join(process.env.HOME, '.local', 'share', this.name1, this.name2) ;
            }
        }
        else {
            throw new Error('Unsupported platform') ;
        }

        return ret ;
    }

    public static allInfineonDeveloperCenterRegistryDir() : string | undefined {
        let ret: string | undefined ;

        if (process.platform === "win32") {
            if (process.env.ALLUSERSPROFILE) {
                ret = path.join(process.env.ALLUSERSPROFILE, this.name1, this.name2) ;
            }
        } else if (process.platform === 'darwin') {
            if (process.env.HOME) {
                ret = path.join('/Library', 'Application Support', this.name1, this.name2) ;
            }
        }
        else if (process.platform === 'linux') {
            if (process.env.HOME) {
                ret = path.join('/usr/local/share', this.name1, this.name2) ;
            }
        }
        else {
            throw new Error('Unsupported platform') ;
        }

        return ret ;        
    }

    public static getCommonInstallLocation() : string | undefined {
        let ret: string | undefined ;

        if (process.platform === "win32") {
            ret = path.join(os.homedir(), 'ModusToolbox') ;
        } else if (process.platform === 'darwin') {
            ret = path.join(os.homedir(), 'ModusToolbox') ;
        }
        else if (process.platform === 'linux') {
            ret = '/Applications/ModusToolbox' ;
        }
        else {
            throw new Error('Unsupported platform') ;
        }

        return ret ;  
    }

    public static readJSONFile(logger: winston.Logger, mod: string, file: string) : any {
        let data ;
        try {
            data = fs.readFileSync(file) ;
            if (data.length >= 3 && data[0] == 0xef && data[1] == 0xbb && data[2] == 0xbf) {
                data = data.subarray(3) ;
            }
        }
        catch(err) {
            let msg = `${mod}: error reading file '${file}' - ${err}` ;
            logger.error(msg) ;
            throw new Error(msg) ;
        }

        let obj ;
        try {
            obj = JSON.parse(data.toString('utf-8')) ;
        }
        catch(err) {
            let msg = `${mod}: error parsing file '${file}' as JSON - ${err}` ;
            logger.error(msg) ;
            throw new Error(msg) ;
        }

        return obj ;
    }

    public static runProg(cmd: string, cwd: string, args: string[]) : Promise<[number, string[]]> {
        let ret = new Promise<[number, string[]]>((resolve, reject) => {
            let text: string = "" ;
            let cp: exec.ChildProcess = exec.spawn(cmd, args, 
                {
                    cwd: cwd,
                    windowsHide: true,
                    shell: false
                }) ;

            cp.stdout?.on('data', (data) => {
                text += (data as Buffer).toString() ;
            }) ;
            cp.stderr?.on('data', (data) => {
                text += (data as Buffer).toString() ;
            }) ;
            cp.on('error', (err) => {
                reject(err);
            }) ;
            cp.on('close', (code) => {
                if (!code) {
                    code = 0 ;
                }

                let ret: string[] = text.split('\n') ;
                resolve([code, ret]);
            });
        }) ;

        return ret ;
    }

    public static callMake(shtools: string, cwd: string, makeargs: string[]) {
        let makepath = path.join(shtools, 'bin', 'make') ;
        let bashpath = path.join(shtools, 'bin', 'bash') ;

        if (process.platform === 'win32') {
            makepath += '.exe' ;
            bashpath += '.exe' ;

            makepath = makepath.replace(/\\/g,'/') ;
            bashpath = bashpath.replace(/\\/g,'/') ;
        }

        let pgm = 'PATH=/bin:/usr/bin ; ' + makepath + ' ' + makeargs.join(' ') ;

        let args = ['--norc', '--noprofile', '-c', pgm] ;
        return this.runProg(bashpath, cwd, args) ;
    }

    public static callGetAppInfo(shtools: string, cwd: string) : Promise<Map<string, string>> {
        let ret = new Promise<Map<string, string>>((resolve, reject) => { 
            this.callMake(shtools, cwd, ['get_app_info', 'CY_PROTOCOL=2', 'MTB_QUERY=1'])
                .then((result) => {
                    if (result[0] !== 0) {
                        reject(new Error(`the call to 'make get_app_info' returns status code ${result[0]}`)) ;
                    }
                    else {
                        let vars = new Map<string, string>() ;
                        for(let one of result[1]) {
                            let equal = one.indexOf('=') ;
                            if (equal !== -1) {
                                let name = one.substring(0, equal) ;
                                let value = one.substring(equal + 1) ;
                                vars.set(name, value) ;
                            }
                        }
                        resolve(vars) ;
                    }
                })
                .catch((err) => {
                    reject(err) ;
                })
        }) ;
        return ret ;

    }
}
