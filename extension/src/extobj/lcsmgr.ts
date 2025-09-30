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

/*
 * LCSManager - Local Content Storage Manager for ModusToolbox BSPs
 *
 * This class manages the local content storage (LCS) of Board Support Packages (BSPs)
 * for ModusToolbox projects. It provides methods to check for updates, add/remove BSPs,
 * apply changes, and synchronize the local BSP list with the manifest database. The manager
 * interacts with the lcs-manager-cli tool and emits events for UI updates.
 */

import EventEmitter = require("events");
import { ModusToolboxEnvironment } from "../mtbenv";
import { MTBAssistObject } from "./mtbassistobj";
import { MTBRunCommandOptions } from "../mtbenv/mtbenv/mtbenv";
import * as path from 'path' ;

export interface CommandData {
    cmd: string ;
    data: any ;
}

export class LCSManager extends EventEmitter {
    // UUID for the lcs-manager-cli tool in the ModusToolbox tools database
    static lcsCliUUID: string = '74a9688f-86e2-4ea0-8590-ca29a4b91ca4' ;
    // Sentinel string used to detect empty watch lists in CLI output
    static sentinelString: string = 'No items in watch list' ;
    private ext_ : MTBAssistObject ;
    private needsUpdate_ : boolean = false ;
    private original_ : string[] = [] ;
    private bsps_ : string[] = [] ;
    private toadd_: string[] = [] ;
    private todel_: string[] = [] ;
    private updates_ : Array<[string, string]> = [] ;

    constructor(ext: MTBAssistObject) {
        super();
        this.ext_ = ext ;
    }

    /**
     * Returns true if there are BSPs queued to be added or removed.
     */
    public get needsApplyChanges() : boolean {
        return this.toadd_.length > 0 || this.todel_.length > 0 ;
    }

    /**
     * Returns true if the LCS is ready (has at least one BSP in local storage).
     */
    public get isLCSReady() : boolean {
        return this.bsps_.length > 0 ;
    }

    /**
     * Returns true if an update is needed (as determined by lcs-manager-cli).
     */
    public get needsUpdate() : boolean {
        return this.needsUpdate_ ;
    }

    /**
     * Returns the list of BSPs currently in local storage.
     */
    public get bspsIn() : string[] {
        return this.bsps_ ;
    }

    /**
     * Returns the list of BSPs queued to be added to local storage.
     */
    public get toAdd() : string[] {
        return this.toadd_ ;
    }

    /**
     * Returns the list of BSPs queued to be removed from local storage.
     */
    public get toDelete() : string[] {
        return this.todel_ ;
    }

    /**
     * Returns the list of BSPs not currently in local storage.
     */
    public get bspsOut() : string[] {
        let allBsps = this.ext_.env?.manifestDB.allBspNames.filter((bsp: string) => !this.bspsIn.includes(bsp)).sort() || [];
        return allBsps ;
    }

    /**
     * Checks for available updates to BSPs using lcs-manager-cli.
     * @returns Promise that resolves to true if updates are available.
     */
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

    /**
     * Updates the list of BSPs in local storage by querying lcs-manager-cli.
     * @returns Promise that resolves when the update is complete.
     */
    public updateBSPS() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.runLCSCmd(['--list-bsps'])
                .then((output) => {
                    if (output[0] !== 0) {
                        reject(new Error("lcs-cli command failed")) ;
                        return ;
                    }
                    this.bsps_ = this.parseOutput(output[1]) ;
                    this.original_ = [...this.bsps_] ;
                    this.ext_.logger.debug('LCS Manager: BSPs updated');
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                });            
        }) ;
        return ret ;
    }

    /**
     * Handles UI commands for managing BSPs (add, remove, revert, etc).
     * @param data - Command data object specifying the action to perform.
     */
    public command(data: any) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            switch (data.cmd) {
                case 'revert' : 
                    this.bsps_ = [...this.original_] ;
                    this.toadd_ = [] ;
                    this.todel_ = [] ;
                    resolve() ;
                    break ;

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

    /**
     * Applies all queued BSP add/remove changes to local storage.
     * @returns Promise that resolves when changes are applied.
     */
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
                this.emit('lcsdone') ;
                resolve() ;
            })
            .catch((error) => {
                reject(error);
            });
        });
        return ret;
    }   

    /**
     * Adds all available BSPs to local storage.
     */
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

    /**
     * Removes all BSPs from local storage.
     */
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

    /**
     * Applies BSP add/remove changes one by one.
     */
    private oneByOne() : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            this.emit('show') ;
            let args : string[] = [];

            if (this.toadd_.length > 0) {
                args = [] ;
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

            resolve() ;
        });
        return ret;
    }

    /**
     * Updates existing BSP content in local storage.
     */
    private updateExistingContent() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let args : string[] = ['--update-existing'] ;
            this.runLCSCmd(args)
                .then((output) => {
                    if (output[0] !== 0) {
                        reject(new Error("lcs-cli command failed")) ;
                        return ;
                    }
                    this.emit('lcsdone');
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                });
        });
        return ret;
    }

    /**
     * Runs the lcs-manager-cli tool with the specified arguments.
     * @param args - Arguments to pass to the CLI tool.
     * @param cb - Optional callback for output lines.
     * @returns Promise resolving to [exitCode, outputLines].
     */
    private runLCSCmd(args: string[], cb?: (lines: string[], id?: any) => void) : Promise<[number, string[]]> {
        let ret = new Promise<[number, string[]]>((resolve, reject) => {
            let cmd = this.findLcsCLI() ;
            if (!cmd) {
                reject(new Error("lcs-cli command not found")) ;
                return ;
            }
            this.ext_.logger.debug(`Running lcs-cli: ${cmd} ${args.join(' ')}`) ;
            let opts: MTBRunCommandOptions = {
                toolspath: this.ext_.toolsDir,
                id: 'lcsmanager',
                onOutput: cb,
            } ;
            ModusToolboxEnvironment.runCmdCaptureOutput(cmd, args, opts)
                .then((output) => {
                    resolve(output) ;
                })
                .catch((error) => {
                    reject(error);
                });
        });
        return ret;
    }

    /**
     * Toggles the presence of a BSP in local storage (queues for add/remove).
     * @param bsp - BSP name to toggle.
     */
    private toggleBSP(bsp: string) {
        if (this.bsps_.includes(bsp)) {
            // BSP is currently in local storage
            if (this.toadd_.includes(bsp)) {
                // Was queued for deletion, remove from delete queue and add back visually
                let index = this.toadd_.indexOf(bsp);
                this.toadd_.splice(index, 1);
                this.bsps_ = this.bsps_.filter(b => b !== bsp);
            }
            else {
                // Add to delete queue and remove visually
                this.todel_.push(bsp);
                this.bsps_ = this.bsps_.filter(b => b !== bsp);
            }
        } else {
            // BSP is currently not in local storage
            if (this.todel_.includes(bsp)) {
                // Was queued for addition, remove from add queue and remove visually
                let index = this.todel_.indexOf(bsp);
                this.todel_.splice(index, 1);
            }
            else {
                // Add to add queue and add visually
                this.toadd_.push(bsp);
                this.bsps_.push(bsp);
            }
        }
    }    

    public findLcsCLIPath() : string | undefined {
        let ret : string | undefined ;
        let tool = this.ext_.env?.toolsDB.findToolByGUID(LCSManager.lcsCliUUID);

        if (tool) {
            ret = tool.path ;
        }
        return ret ;
    }

    /**
     * Finds the path to the lcs-manager-cli tool in the ModusToolbox environment.
     * @returns Path to the CLI tool, or undefined if not found.
     */
    private findLcsCLI() : string | undefined {
        let ret : string | undefined ;

        let tool = this.ext_.env?.toolsDB.findToolByGUID(LCSManager.lcsCliUUID);
        if (tool) {
            ret = path.join(tool.path, 'lcs-manager-cli') ;
        }
        return ret ;
    }

    /**
     * Parses the output of lcs-manager-cli to determine if updates are needed.
     * @param output - Output lines from the CLI tool.
     */
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

    /**
     * Parses the output of lcs-manager-cli to extract BSP names.
     * @param output - Output lines from the CLI tool.
     * @returns Array of BSP names.
     */
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