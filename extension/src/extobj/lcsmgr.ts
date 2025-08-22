import EventEmitter = require("events");
import { ModusToolboxEnvironment } from "../mtbenv";
import * as os from 'os';
import * as path from 'path' ;
import { MTBAssistObject } from "./mtbassistobj";
import { log } from "util";

export interface CommandData {
    cmd: string ;
    data: any ;
}

export class LCSManager extends EventEmitter {
    static lcsCliUUID: string = '74a9688f-86e2-4ea0-8590-ca29a4b91ca4' ;
    static sentinelString: string = 'No items in watch list' ;
    private ext_ : MTBAssistObject ;
    private needsUpdate_ : boolean = false ;
    private bsps_ : string[] = [] ;
    private toadd_: string[] = [] ;
    private todel_: string[] = [] ;
    private updates_ : Array<[string, string]> = [] ;

    constructor(ext: MTBAssistObject) {
        super();
        this.ext_ = ext ;
    }

    public get needsApplyChanges() : boolean {
        return this.toadd_.length > 0 || this.todel_.length > 0 ;
    }

    public get isValid() : boolean {
        return this.bsps_.length > 0 ;
    }

    public get needsUpdate() : boolean {
        return this.needsUpdate_ ;
    }

    public get bspsIn() : string[] {
        return this.bsps_ ;
    }

    public get toAdd() : string[] {
        return this.toadd_ ;
    }

    public get toDelete() : string[] {
        return this.todel_ ;
    }

    public get bspsOut() : string[] {
        let allBsps = this.ext_.env?.manifestDB.allBspNames.filter((bsp) => !this.bspsIn.includes(bsp)).sort() || [];
        return allBsps ;
    }

    public updateNeedsUpdate() : Promise<boolean> {
        let ret = new Promise<boolean>((resolve, reject) => {
            this.runLCSCmd(['--check-for-updates'])
                .then((output) => {
                    if (output[0] !== 0) {
                        reject(new Error("lcs-cli command failed")) ;
                        return ;
                    }
                    this.parseNeedsUpdate(output[1]) ;
                    resolve(this.needsUpdate_);
                })
                .catch((error) => {
                    reject(error);
                });
        });
        return ret;
    }

    public updateBSPS() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.runLCSCmd(['--list-bsps'])
                .then((output) => {
                    if (output[0] !== 0) {
                        reject(new Error("lcs-cli command failed")) ;
                        return ;
                    }
                    this.bsps_ = this.parseOutput(output[1]) ;
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                });            
        }) ;
        return ret ;
    }

    public command(data: any) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            switch (data.cmd) {
                case 'togglebsp':
                    this.toggleBSP(data.bsp);
                    resolve() ;
                    break;
                case 'update':
                    this.updateExistingContent()
                    .then(() => {
                        resolve() ;
                    })
                    .catch((err) => {
                        reject(err);
                    });
                break;
                case 'check':
                    this.updateNeedsUpdate()
                    .then(() => {
                        resolve() ;
                    })
                    .catch((error) => {
                        reject(error);
                    }); 
                    break ;
                case 'apply':
                    this.applyBSPChanges()
                    .then(() => {
                        resolve() ;
                    })
                    .catch((error) => {
                        reject(error);
                    });
                    break;
                case 'moveAllToLocal':
                    // Move all BSPs from "Not In Local Storage" to "In Local Storage"
                    // Get BSPs that are currently not in local storage (excluding those already queued to be added)
                    let bspsToAdd = this.bspsOut.filter(bsp => !this.toadd_.includes(bsp));
                    this.toadd_ = [...this.toadd_, ...bspsToAdd];
                    // Move them visually by adding them to bsps_ (the "In Local Storage" list)
                    this.bsps_ = [...this.bsps_, ...bspsToAdd];
                    // Remove from todel_ if they were queued for deletion
                    this.todel_ = this.todel_.filter(bsp => !bspsToAdd.includes(bsp));
                    resolve();
                    break;
                case 'removeAllFromLocal':
                    // Move all BSPs from "In Local Storage" to "Not In Local Storage"
                    // Get BSPs that are currently in local storage (excluding those already queued to be removed)
                    let bspsToRemove = this.bspsIn.filter(bsp => !this.todel_.includes(bsp));
                    this.todel_ = [...this.todel_, ...bspsToRemove];
                    // Move them visually by removing them from bsps_ (the "In Local Storage" list)
                    this.bsps_ = this.bsps_.filter(bsp => !bspsToRemove.includes(bsp));
                    // Remove from toadd_ if they were queued for addition
                    this.toadd_ = this.toadd_.filter(bsp => !bspsToRemove.includes(bsp));
                    resolve();
                    break;
                default:
                    break;
            }
        }) ;
        return ret;
    }

    private show(lines: string[]) {
        lines.forEach((line) => {
            this.ext_.logger.info(line);
        });
    }

    private applyBSPChanges() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.emit('show') ;
            let all = new Set([...this.ext_.env?.manifestDB.allBspNames || []]);
            let finishadd = new Set([...this.bspsIn, ...this.toadd_]) ;
            let finishdel = new Set([...this.bspsOut, ...this.todel_]) ;

            let p : Promise<void> ;
            if (all === finishadd) {
                // We want to add all BSPS
                p = this.addAllBSPSs() ;
            }
            else if (all === finishdel) {
                // We want to remove them all
                p = this.removeAllBSPSs() ;
            }
            else {
                // Process the adds and deletes
                p = this.oneByOne() ;
            }

            p.then(() => {  
                this.ext_.logger.info('******************************************************') ; 
                this.ext_.logger.info('******************************************************') ;                               
                this.ext_.logger.info('Local Content Storage BSP changes applied successfully') ;
                this.ext_.logger.info('******************************************************') ; 
                this.ext_.logger.info('******************************************************') ;                               
                resolve() ;
            })
            .catch((error) => {
                reject(error);
            });
        });
        return ret;
    }   

    private addAllBSPSs() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.emit('show') ;
            this.runLCSCmd(['--add-all'], this.show.bind(this))
                .then((output) => {
                    if (output[0] !== 0) {
                        reject(new Error("lcs-cli command failed")) ;
                        return ;
                    }
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                }); 
        });
        return ret;
    }

    private removeAllBSPSs() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.emit('show') ;
            this.runLCSCmd(['--clear-all'], this.show.bind(this))
                .then((output) => {
                    if (output[0] !== 0) {
                        reject(new Error("lcs-cli command failed")) ;
                        return ;
                    }
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                }); 
        });
        return ret;
    }

    private oneByOne() : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            this.emit('show') ;
            let args : string[] = [];

            if (this.todel_.length > 0) {
                for(let bsp of this.todel_) {
                    args.push('--clear-bsp');
                    args.push(bsp);
                }
                try {
                    await this.runLCSCmd(args, this.show.bind(this)) ;
                    this.todel_ = [] ; // Clear the delete queue after processing
                } catch (error) {
                    reject(error);
                }
            }

            if (this.toadd_.length > 0) {
                for(let bsp of this.toadd_) {
                    args.push('--add-bsp');
                    args.push(bsp);
                }
                try {
                    await this.runLCSCmd(args, this.show.bind(this)) ;
                    this.toadd_ = [] ; // Clear the add queue after processing
                } catch (error) {
                    reject(error);
                }
            }

            resolve() ;
        });
        return ret;
    }

    private updateExistingContent() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let args : string[] = ['--update-existing'] ;
            this.runLCSCmd(args)
                .then((output) => {
                    if (output[0] !== 0) {
                        reject(new Error("lcs-cli command failed")) ;
                        return ;
                    }
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                });
        });
        return ret;
    }

    private runLCSCmd(args: string[], cb?: (lines: string[], id?: any) => void) : Promise<[number, string[]]> {
        let ret = new Promise<[number, string[]]>((resolve, reject) => {
            let cmd = this.findLcsCLI() ;
            if (!cmd) {
                reject(new Error("lcs-cli command not found")) ;
                return ;
            }
            ModusToolboxEnvironment.runCmdCaptureOutput(os.homedir(), cmd, this.ext_.toolsDir, args, cb)
                .then((output) => {
                    resolve(output) ;
                })
                .catch((error) => {
                    reject(error);
                });
        });
        return ret;
    }

    private toggleBSP(bsp: string) {
        if (this.bsps_.includes(bsp)) {
            // BSP is currently in local storage
            if (this.todel_.includes(bsp)) {
                // Was queued for deletion, remove from delete queue and add back visually
                let index = this.todel_.indexOf(bsp);
                this.todel_.splice(index, 1);
            }
            else {
                // Add to delete queue and remove visually
                this.todel_.push(bsp);
                this.bsps_ = this.bsps_.filter(b => b !== bsp);
            }
        } else {
            // BSP is currently not in local storage
            if (this.toadd_.includes(bsp)) {
                // Was queued for addition, remove from add queue and remove visually
                let index = this.toadd_.indexOf(bsp);
                this.toadd_.splice(index, 1);
            }
            else {
                // Add to add queue and add visually
                this.toadd_.push(bsp);
                this.bsps_.push(bsp);
            }
        }
    }    

    private findLcsCLI() : string | undefined {
        let ret : string | undefined ;

        let tool = this.ext_.env?.toolsDB.findToolByGUID(LCSManager.lcsCliUUID);
        if (tool) {
            ret = path.join(tool.path, 'lcs-manager-cli') ;
        }
        return ret ;
    }

    private parseNeedsUpdate(output: string[]) {
        if (output.length > 3 && output[1].indexOf('Updates available') !== -1) {
            this.needsUpdate_ = true;
            for(let i = 3 ; i < output.length ; i++) {
                let line = output[i].trim() ;
                let words = line.split(' ') ;
                if (words.length === 2) {
                    this.updates_.push([words[0], words[1]]) ;
                }
            }
        }
        else {
            this.needsUpdate_ = false ;
        }
    }

    private parseOutput(output: string[]) {
        let ret: string[] = [] ;
        if (output[0].indexOf(LCSManager.sentinelString) === -1) {
            for(let line of output) {
                let bsp = line.trim() ;
                if (bsp.length > 0) {
                    ret.push(bsp) ;
                }
            }
        }
        return ret;
    }
}