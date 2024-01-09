import * as path from 'path' ;
import * as exec from 'child_process' ;
import * as os from 'os' ;
import * as vscode from 'vscode' ;
import { MTBExtensionInfo, MessageType } from './mtbextinfo';
import { mtbRunMakeGetLibs } from './mtbcommands';

export class MTBDevKit {
    public readonly serial : string ;
    public readonly mode: string;
    public readonly version: string ;
    public readonly outdated: boolean ;
    public name: string | undefined ;
    public siliconID: string | undefined ;
    public targetInfo: string | undefined ;
    public programmingProperties : string | undefined ;
    public bridgingProperties : string | undefined ;
    public kitProg3Properties: string | undefined ;
    public qspiProperties : string | undefined ;
    public connectivityOptions: string | undefined ;
    public fram: string | undefined ;
    public boardFeatures: string[] = [] ;

    public constructor(serial: string, mode: string, version: string, outdated: boolean) {
        this.serial = serial ;
        this.mode = mode;
        this.version = version ;
        this.outdated = outdated;
    }
} ;

export class MTBDevKitMgr {
    public kits : MTBDevKit[] = [] ;
    private changedCallbacks: (() => void)[] = [] ;

    private static vmatch: RegExp = new RegExp("[0-9]+\\.[0-9]+\\.[0-9]+") ;
    private static tags: string[] = ['Bootloader-', 'CMSIS-DAP HID-', 'CMSIS-DAP BULK-'] ;
    private static kitLineMatch: RegExp = new RegExp('^\t[1-9]+[0-9]*') ;
    private static theNameTag = "The name:" ;
    private static theSiliconID = "Silicon ID:" ;
    private static theTargetInfo = "Target Info:" ;
    private static theProgrammingProperties = "Programming Properties:" ;
    private static theBridgingProperties = "Bridging Properties:" ;
    private static theKitProg3Properties = "KitProg3 Properties:" ;
    private static theQSPIProperties = "QSPI Properties:" ;
    private static theConnectivityOptions = "Connectivity options:" ;
    private static theFRAM = "FRAM:" ;
    private static theBoardFeatures = "Board Features:" ;    

    public constructor() {
    }

    public needsUpgrade() : boolean {
        let ret = false ;

        for(let kit of this.kits) {
            if (kit.outdated) {
                ret = true ;
                break ;
            }
        }

        return ret;
    }

    public addKitsChangedCallback(cb: () => void) {
        this.changedCallbacks.push(cb) ;
    }

    public updateFirmware(serial: string) {
        let fwload: string = path.join(MTBExtensionInfo.getMtbExtensionInfo().toolsDir, "fw-loader", "bin", "fw-loader");
        if (process.platform === "win32") {
            fwload += ".exe" ;
        }

        let args: string[] = ["--update-kp3", serial] ;

        this.runCmdCaptureOutput(os.homedir(), fwload, args)
            .then((result) => {
                vscode.window.showInformationMessage("Kit Prog 3 [" + serial + "] has been updated") ;
            })
            .catch((err) => { 

            }) ;
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
        return line.substring(0, 16) ;
    }

    private extractVersion(line: string) : string {
        let ret: string = "?.?.?" ;
        let result = MTBDevKitMgr.vmatch.exec(line) ;
        if (result) {
            ret = result[0] ;
        }
        return ret;
    }

    private async extractOneKit(line: string) : Promise<void> {
        let ret: Promise<void> = new Promise<void>((resolve, reject) => { 
            (async () => {
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
                    try {
                        await this.getKitDetails(kit) ;
                        this.kits.push(kit);
                        resolve() ;
                    }
                    catch(err) {
                        let errobj: Error = err as Error ;
                        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "cannot get kit details - " + errobj.message) ;
                        reject(err);
                    }
                }
            })() ;
        }) ;

        return ret;
    }


    private extractAfter(tag:string, line: string) : string {
        return line.substring(tag.length).trim() ;
    }

    private extractKitDetails(kit: MTBDevKit, lines: string[]) : boolean {
        for(let line of lines) {
            if (line.startsWith(MTBDevKitMgr.theNameTag)) {
                kit.name = this.extractAfter(MTBDevKitMgr.theNameTag, line) ;
            }
            else if (line.startsWith(MTBDevKitMgr.theSiliconID)) {
                kit.siliconID = this.extractAfter(MTBDevKitMgr.theSiliconID, line) ;
            }
            else if (line.startsWith(MTBDevKitMgr.theTargetInfo)) {
                kit.targetInfo = this.extractAfter(MTBDevKitMgr.theTargetInfo, line) ;
            }
            else if (line.startsWith(MTBDevKitMgr.theProgrammingProperties)) {
                kit.programmingProperties = this.extractAfter(MTBDevKitMgr.theProgrammingProperties, line) ;
            }
            else if (line.startsWith(MTBDevKitMgr.theBridgingProperties)) {
                kit.bridgingProperties = this.extractAfter(MTBDevKitMgr.theBridgingProperties, line) ;
            }
            else if (line.startsWith(MTBDevKitMgr.theKitProg3Properties)) {
                kit.kitProg3Properties = this.extractAfter(MTBDevKitMgr.theKitProg3Properties, line) ;
            }
            else if (line.startsWith(MTBDevKitMgr.theQSPIProperties)) {
                kit.qspiProperties = this.extractAfter(MTBDevKitMgr.theQSPIProperties, line) ;
            }
            else if (line.startsWith(MTBDevKitMgr.theConnectivityOptions)) {
                kit.connectivityOptions = this.extractAfter(MTBDevKitMgr.theConnectivityOptions, line) ;
            }
            else if (line.startsWith(MTBDevKitMgr.theFRAM)) {
                kit.fram = this.extractAfter(MTBDevKitMgr.theFRAM, line) ;
            }
            else if (line.startsWith(MTBDevKitMgr.theBoardFeatures)) {
                kit.boardFeatures = this.extractAfter(MTBDevKitMgr.theBoardFeatures, line).split(',');
            }
        }
        return true ;
    }

    private async getKitDetails(kit: MTBDevKit) : Promise<void> {
        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
            let fwload: string = path.join(MTBExtensionInfo.getMtbExtensionInfo().toolsDir, "fw-loader", "bin", "fw-loader");
            if (process.platform === "win32") {
                fwload += ".exe" ;
            }
            let args: string[] = [ "--info", kit.serial] ;

            this.runCmdCaptureOutput(os.homedir(), fwload, args)
            .then((result) => {
                let res: [number, string[]] = result as [number, string[]] ;
                if (res[0] !== 0) {
                    reject(new Error("fw-loader returned exit code " + res[0]));
                }
                else {
                    if (this.extractKitDetails(kit, res[1])) {
                        resolve() ;
                    }
                    else {
                        reject("invalid response for kit details") ;
                    }
                }
            })
            .catch((err) => {
                reject(err);
            }) ;
        }) ;

        return ret;
    }

    private async extractKits(lines: string[]) {
        for(let line of lines) {
            if (MTBDevKitMgr.kitLineMatch.test(line)) {
                await this.extractOneKit(line);
            }
        }

        for(let cb of this.changedCallbacks) {
            cb() ;
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