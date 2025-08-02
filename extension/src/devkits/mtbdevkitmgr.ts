import * as path from 'path' ;
import * as fs from 'fs' ;
import * as exec from 'child_process' ;
import * as os from 'os' ;
import * as vscode from 'vscode' ;
import { MTBDevKit } from './mtbdevkit';
import { MtbManagerBase } from '../mgrbase/mgrbase';
import { MTBAssistObject } from '../extobj/mtbassistobj';

export class MTBDevKitMgr extends MtbManagerBase {

    private static fwloaderUUID: string = '1901ec91-2683-4ab4-8034-211b772c9a2b' ;
    private static fwloaderProgramUUID: string = 'e41750c7-ec03-45be-af76-60108f35e4d3' ;

    public kits : MTBDevKit[] = [] ;
    private changedCallbacks: (() => void)[] = [] ;
    private scanning: boolean = false ;

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

    public constructor(ext: MTBAssistObject) {
        super(ext);
    }

    public init() : Promise<void> {
        let promise = new Promise<void>((resolve, reject) => {
            this.scanForDevKits()
                .then((st: boolean) => {
                    this.logger.info('MTBDevKitMgr initialized successfully.');
                    resolve();
                })
                .catch((error: Error) => {
                    this.logger.error('Failed to initialize MTBDevKitMgr:', error.message);
                    reject(error);
                });
        });

        return promise;
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
        if (this.changedCallbacks.indexOf(cb) === -1) {
            this.changedCallbacks.push(cb) ;
        }
    }

    public getKitBySerial(serial: string) : MTBDevKit | undefined {
        for(let kit of this.kits) {
            if (kit.serial === serial) {
                return kit ;
            }
        }

        return undefined ;
    }

    public updateFirmware(serial: string) {
        let options: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: "ModusToolbox: ",
            cancellable: false
        };
    
        vscode.window.withProgress(options, (progress) => {
            let p = new Promise<void>((resolve, reject) => {
                progress.report({ message: 'Updating development kit - please wait'});
                let fwload = this.findFWLoader() ;
                if (fwload === undefined) {
                    progress.report({ message: 'Could not find fw-loader tool - update failed.'});
                    reject(new Error('Could not find fw-loader tool.')) ;
                    return ;
                }

                let kit: MTBDevKit | undefined = this.getKitBySerial(serial) ;

                if (kit) {
                    let args: string[] = [] ;
                    
                    if (kit.kptype === 'kp3') {
                        args.push('--update-kp3');
                    }
                    else if (kit.kptype === 'kp2') {
                        args.push('--update-kp2');
                    }
                    else {
                        vscode.window.showErrorMessage('Unknown kitprog type/version - update failed') ;
                        return ;
                    }

                    args.push(serial) ;
                    this.runCmdLogOutput(os.homedir(), fwload, args)
                        .then((result) => {
                            this.scanForDevKits()
                            .then((st: boolean) => {
                                resolve() ;
                            })
                            .catch((err) => {
                                vscode.window.showErrorMessage('Kit Prog 3 [' + serial + '] update failed - ' + err.message) ;
                                reject(err);
                            }) ;
                        })
                        .catch((err) => { 
                        }) ;
                }
                else {
                    vscode.window.showInformationMessage("The device with serial number '" + serial + "' has been removed") ;
                }
            }) ;

            return p ;
        }) ;
    }

    public updateAllFirmware() {
        let options: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: "ModusToolbox: ",
            cancellable: false
        };
    
        vscode.window.withProgress(options, (progress) => {
            let p = new Promise<void>((resolve, reject) => {
                progress.report({ message: 'Updating development kits - please wait'});
                let fwload = this.findFWLoader() ;
                if (fwload === undefined) {
                    progress.report({ message: 'Could not find fw-loader tool - update failed.'});
                    reject(new Error('Could not find fw-loader tool.')) ;
                    return ;
                }

                let args: string[] = [] ;
                args.push('--update-kp3');
                args.push('all') ;
                let opts = {
                    modal: true
                } ;
                this.runCmdLogOutput(os.homedir(), fwload, args)
                .then((result) => {
                    this.scanForDevKits()
                    .then((st: boolean) => {
                        resolve() ;
                    })
                    .catch((err) => {
                        reject(err);
                    }) ;
                })
                .catch((err) => { 
                    reject(err);
                }) ;
            }) ;

            return p;
        }) ;
    }

    private isNotConnected(output: [number, string[]]) : boolean {
        let ret: boolean = false ;
        if (output[0] === 1) {
            for(let line of output[1]) {
                if (line.indexOf('No connected devices') !== -1) {
                    ret = true ;
                    break ;
                }
            }
        }

        return ret ;
    }

    public scanForDevKits() : Promise<boolean> {
        let ret: Promise<boolean> = new Promise<boolean>((resolve, reject) => {
            if (this.scanning) {
                reject(new Error("You have asked to scan for development kits while a previous scan is still in progress.  Only one scan is allowed at a time.")) ;
            }
            (async() => {
                this.scanning = true ;
                let fwload = this.findFWLoader() ;
                if (fwload === undefined) {
                    this.scanning = false ;
                    reject(new Error('Could not find fw-loader tool.')) ;
                    return ;
                }

                let args: string[] = ["--device-list"] ;

                this.runCmdCaptureOutput(os.homedir(), fwload, args)
                    .then((result) => { (async() => { 
                            let res: [number, string[]] = result as [number, string[]] ;
                            if (res[0] !== 0 && !this.isNotConnected(res)) {
                                this.scanning = false ;
                                for(let line of res[1]) {
                                    this.logger.debug(line) ;
                                }
                            }
                            else {
                                if (res[0] === 0) {
                                    await this.extractKits(res[1]);
                                }
                                this.scanning = false ;
                                resolve(true) ;
                            }
                        })() ;
                    })
                    .catch((err) => {
                        this.scanning = false ;
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
                let kptype: string = "?" ;
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

                if (found) {
                    if (line.indexOf('outdated') !== -1) {
                        outdated = true ;
                    }

                    if (line.indexOf('KitProg3') !== -1) {
                        kptype = 'kp3' ;
                    }
                    else if (line.indexOf('KitProg2') !== -1) {
                        kptype = 'kp2' ;
                    }

                    let kit: MTBDevKit | undefined = this.getKitBySerial(serial) ;
                    if (kit === undefined) {
                        kit = new MTBDevKit(kptype, serial, mode, version, outdated) ;
                        try {
                            await this.getKitDetails(kit) ;
                            this.kits.push(kit);
                            resolve() ;
                        }
                        catch(err) {
                            let errobj: Error = err as Error ;
                            this.logger.error('Failed to get details for kit with serial ' + serial + ': ' + errobj.message);
                            reject(err);
                        }
                    }
                    else {
                        //
                        // This could have been updated
                        //
                        kit.outdated = outdated ;
                        kit.present = true ;
                        resolve();
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
            let fwload = this.findFWLoader() ;
            if (fwload === undefined) {
                reject(new Error('Could not find fw-loader tool.')) ;
                return ;
            }
            let args: string[] = [ "--info", kit.serial] ;

            this.runCmdCaptureOutput(os.homedir(), fwload, args)
            .then((result) => {
                let res: [number, string[]] = result as [number, string[]] ;
                if (res[0] !== 0) {
                    for(let line of res[1]) {
                        this.logger.debug(line);
                    }
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

    private async extractKits(lines: string[]) : Promise<void> {
        let ret: Promise<void> = new Promise<void>((resolve, reject) => { 
            (async() => { 
                for(let kit of this.kits) {
                    kit.present = false ;
                }

                for(let line of lines) {
                    if (MTBDevKitMgr.kitLineMatch.test(line)) {
                        await this.extractOneKit(line);
                    }
                }

                let i: number = 0 ;
                while (i < this.kits.length) {
                    if (this.kits[i].present) {
                        i++ ;
                    }
                    else {
                        this.kits.splice(i, 1) ;
                    }
                }        

                for(let cb of this.changedCallbacks) {
                    cb() ;
                }

                resolve() ;
            })() ;
        }) ;

        return ret ;
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

    private sendToLog(text: string) : string {
        while (true) {
            let index: number = text.indexOf('\n') ;
            if (index === -1) {
                break ;
            }

            let line: string = text.substring(0, index).trim() ;
            this.logger.debug(line) ;
            text = text.substring(index).trim() ;
        }

        return text ;
    }

    private async runCmdLogOutput(cwd: string, cmd: string, args: string[]) : Promise<[number, string[]]> {
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
                    text = this.sendToLog(text) ;
                }) ;
                cp.stderr?.on('data', (data) => {
                    text += (data as Buffer).toString() ;
                    text = this.sendToLog(text) ;
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

    private findFWLoader() : string | undefined {
        let ext = this.ext ;
        if (!ext) {
            this.ext.logger.error('MTBAssistObject is not initialized - cannot find fw-loader.');
            return undefined ;
        }

        let env = ext.env ;
        if (!env || env.isLoading) {
            this.ext.logger.error('ModusToolbox environment is not initialized - cannot find fw-loader.');
            return undefined ;
        }

        let fwloader = env.toolsDB.findToolByGUID(MTBDevKitMgr.fwloaderUUID) ;
        if (!fwloader) {
            this.ext.logger.error('ModusToolbox environment does not contain fw-loader tool - cannot find fw-loader.');
            return undefined ;
        }

        if (!fwloader.props) {
            this.ext.logger.error('ModusToolbox environment does not contain properties for fw-loader tool - cannot find fw-loader.');
            return undefined ;
        }

        if (!fwloader.props.opt || !fwloader.props.opt.programs) {
            this.ext.logger.error('ModusToolbox environment does not contain programs for fw-loader tool - cannot find fw-loader.');
            return undefined ;
        }

        for(let pgm of fwloader.props.opt.programs) {
            if (pgm.id === MTBDevKitMgr.fwloaderProgramUUID) {
                return path.join(fwloader.path, pgm.exe) ;
            }
        }

        this.ext.logger.error('ModusToolbox environment does not contain fw-loader tool - cannot find fw-loader.');
        return undefined ;        
    }
}