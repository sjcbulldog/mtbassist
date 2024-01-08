import * as path from 'path' ;
import * as exec from 'child_process' ;
import * as os from 'os' ;
import { MTBExtensionInfo, MessageType } from './mtbextinfo';
import { mtbRunMakeGetLibs } from './mtbcommands';

export class MTBDevKit {
    public readonly serial : string ;
    public readonly mode: string;
    public readonly version: string ;
    public readonly outdated: boolean ;

    public constructor(serial: string, mode: string, version: string, outdated: boolean) {
        this.serial = serial ;
        this.mode = mode;
        this.version = version ;
        this.outdated = outdated;
    }
}

export class MTBDevKitMgr {
    private kits_ : MTBDevKit[] = [] ;
    private static vmatch: RegExp = new RegExp("[0-9]+\\.[0-9]+\\.[0-9]+") ;
    private static tags: string[] = ['Bootloader-', 'CMSIS-DAP HID-', 'CMSIS-DAP BULK-'] ;
    private static kitLineMatch: RegExp = new RegExp('^\t[1-9]+[0-9]*') ;

    public constructor() {
    }

    public init() : Promise<boolean> {
        let ret: Promise<boolean> = new Promise<boolean>((resolve, reject) => {
            (async() => {
                let fwload: string = path.join(MTBExtensionInfo.getMtbExtensionInfo().toolsDir, "fw-loader", "bin", "fw-loader");
                if (process.platform === "win32") {
                    fwload += ".exe" ;
                }

                let args: string[] = ["--device-list"] ;

                this.runCmdCaptureOutput(os.homedir(), fwload, args)
                    .then((result) => {
                        let res: [number, string[]] = result as [number, string[]] ;
                        if (res[0] !== 0) {
                            reject(new Error("fw-loader returned exit code " + res[0]));
                        }
                        else {
                            this.extractKits(res[1]);
                            resolve(true) ;
                        }
                    })
                    .catch((err) => {
                        reject(err);
                    }) ;
                })() ;
        }) ;
        return ret;
    }

    private extractSerial(line: string) : string {
        let index: number = line.indexOf(' ') ;
        return line.substring(0, index) ;
    }

    private extractVersion(line: string) : string {
        let ret: string = "?.?.?" ;
        let result = MTBDevKitMgr.vmatch.exec(line) ;
        if (result) {
            ret = result[0] ;
        }
        return ret;
    }

    private extractOneKit(line: string) {
        // KitProg3 Bootloader-HEX FW Version #.#.# [outdated]
        // KitProg3 CMSIS-DAP HID-HEX FW Version #.#.# [outdated]
        // KitProg3 CMSIS-DAP BULK-HEX FW Version #.#.# [outdated]

        let outdated: boolean = false ;
        let serial: string = "" ;
        let mode: string = "" ;
        let version: string = "" ;
        let found: boolean = false ;

        for(let tag of MTBDevKitMgr.tags) {
            let index = line.indexOf(tag) ;
            if (index !== -1) {
                serial = this.extractSerial(line.substring(index + tag.length));
                version = this.extractVersion(line) ;
                if (tag.indexOf('Bootloader') !== -1) {
                    mode = 'BOOTLOADER' ;
                }
                else if (tag.indexOf('HID') !== -1) {
                    mode = 'HID' ;
                }
                else if (tag.indexOf('BULK') !== -1) {
                    mode = 'BULK' ;
                }
                else {
                    mode = 'UNKNOWN' ;
                }
                found = true ;
                break ;
            }
        }

        if (line.indexOf('outdated')) {
            outdated = true ;
        }

        if (found) {
            let kit: MTBDevKit = new MTBDevKit(serial, mode, version, outdated) ;
            this.kits_.push(kit);
        }
    }

    private extractKits(lines: string[]) {
        for(let line of lines) {
            if (MTBDevKitMgr.kitLineMatch.test(line)) {
                this.extractOneKit(line);
            }
        }
    }

    private async runCmdCaptureOutput(cwd: string, cmd: string, args: string[]) : Promise<[number, string[]]> {
        let ret: Promise<[number, string[]]> = new Promise<[number, string[]]>((resolve, reject) => {
            (async () => {
                let text: string = "" ;
                let cp: exec.ChildProcess = exec.spawn(cmd, args , 
                    {
                        cwd: cwd,
                        windowsHide: true
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
            })() ;
        }) ;

        return ret;
    }
}