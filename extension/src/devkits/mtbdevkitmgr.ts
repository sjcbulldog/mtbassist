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

import * as path from 'path' ;
import * as os from 'os' ;
import * as vscode from 'vscode' ;
import * as fs from 'fs' ;
import { MTBDevKit } from './mtbdevkit';
import { MtbManagerBase } from '../mgrbase/mgrbase';
import { MTBAssistObject } from '../extobj/mtbassistobj';
import { ModusToolboxEnvironment, MTBLoadFlags } from '../mtbenv';
import { DevKitInfo } from '../comms';
import { MTBRunCommandOptions } from '../mtbenv/mtbenv/mtbenv';

/**
 * Interface for mapping development kit names to their valid BSP choices
 */
interface DevKitName2BSPMapping {
    name: string ;
    validBSPs: string[] ;
}

/**
 * MTBDevKitMgr - Manager for ModusToolbox development kits
 * 
 * This class handles discovery, management, and firmware updates for ModusToolbox
 * development kits connected via USB. It uses the fw-loader tool to communicate
 * with kits, extract their properties, and manage firmware updates. The manager
 * maintains a list of detected kits and their current status, including firmware
 * versions and BSP compatibility.
 */
export class MTBDevKitMgr extends MtbManagerBase {

    /** UUID identifier for the fw-loader tool in the ModusToolbox tools database */
    private static fwloaderUUID: string = '1901ec91-2683-4ab4-8034-211b772c9a2b' ;
    
    /** UUID identifier for the fw-loader program executable */
    private static fwloaderProgramUUID: string = 'e41750c7-ec03-45be-af76-60108f35e4d3' ;

    /** Regular expression to match firmware version numbers (e.g., "2.1.3") */
    private static vmatch: RegExp = new RegExp("[0-9]+\\.[0-9]+\\.[0-9]+") ;
    
    /** Tags used to identify different kit connection modes in fw-loader output */
    private static tags: string[] = ['Bootloader-', 'CMSIS-DAP HID-', 'CMSIS-DAP BULK-'] ;
    
    /** Regular expression to match kit listing lines starting with tab and device number */
    private static kitLineMatch: RegExp = new RegExp('^\t[1-9]+[0-9]*') ;
    
    /** String constants for parsing kit detail information from fw-loader output */
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

    /** Array of currently detected development kits */
    public kits : MTBDevKit[] = [] ;
    
    /** Flag to prevent concurrent scanning operations */
    private scanning: boolean = false ;
    
    /** Persistent mapping of kit serial numbers to their selected BSPs */
    private devkitBsp: Array<[string, string]> = [] ;
    
    /** Mapping configuration for kit names to valid BSP choices */
    private devKitMapping: DevKitName2BSPMapping[] = [] ;

    /**
     * Constructor - Initialize the development kit manager
     * 
     * @param ext - Reference to the main MTBAssistObject extension instance
     */
    public constructor(ext: MTBAssistObject) {
        super(ext);
        // Load previously saved BSP selections for kits
        this.loadBSPSKitData() ;
        // Load BSP mapping configuration from external file
        this.devKitMapping = this.loadBSPMapping() ;
    }

    /**
     * Get information about all detected development kits
     * 
     * @returns Array of DevKitInfo objects containing complete kit information
     */
    public get devKitInfo() : DevKitInfo[] {
        return this.kits.map(kit => kit.info(this.devKitBspChoices(kit))) ;
    }

    /**
     * Get the list of valid BSP choices for a specific development kit
     * 
     * Determines which BSPs are compatible with the given kit based on
     * the BSP mapping configuration and currently active manifest BSPs.
     * 
     * @param kit - The development kit to get BSP choices for
     * @returns Array of valid BSP identifiers for the kit
     */
    private devKitBspChoices(kit: MTBDevKit) {
        let ret: string[] = [] ;
        
        // Look for kit-specific BSP mapping based on kit name
        let mapentry = this.devKitMapping.find(entry => entry.name === kit.name) ;
        if (mapentry) {
            // Use only BSPs that are both valid for this kit and currently active
            for(let bsp of mapentry.validBSPs) {
                if (this.ext.env!.manifestDB.activeBspNames.includes(bsp)) {
                    ret.push(bsp) ;
                }
            }
        }
        else {
            // No specific mapping found, use all active BSPs
            ret = this.ext.env!.manifestDB.activeBspNames ;
        }
        return ret ;
    }

    /**
     * Initialize the development kit manager
     * 
     * Performs initial scan for connected development kits and sets up
     * the manager for operation. This should be called after the
     * ModusToolbox environment is fully loaded.
     * 
     * @returns Promise that resolves when initialization is complete
     */
    public init() : Promise<void> {
        let promise = new Promise<void>((resolve, reject) => {
            this.scanForDevKits()
                .then((st: boolean) => {
                    this.logger.info(`MTBDevKitMgr initialized successfully - ${this.devKitInfo.length} kits detected.`);
                    resolve();
                })
                .catch((error: Error) => {
                    this.logger.error('Failed to initialize MTBDevKitMgr:', error.message);
                    reject(error);
                });
        });

        return promise;
    }

    /**
     * Update the BSP selection for a kit and persist the change
     * 
     * @param serial - Serial number of the kit
     * @param bsp - BSP identifier to associate with the kit
     */
    private updateBSPKitData(serial: string, bsp: string) {
        // Find existing entry or create new one
        let existingEntry = this.devkitBsp.find(entry => entry[0] === serial);
        if (existingEntry) {
            existingEntry[1] = bsp;
        } else {
            this.devkitBsp.push([serial, bsp]);
        }
        // Persist the updated mapping to global state
        this.storeKitBSPData() ;
    }

    /**
     * Update the BSP selection for a development kit
     * 
     * @param kit - DevKitInfo object representing the kit
     * @param bsp - BSP identifier to associate with the kit
     * @returns Promise that resolves when the update is complete
     */
    public updateDevKitBsp(kit: DevKitInfo, bsp: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let existingKit = this.getKitBySerial(kit.serial);
            if (existingKit) {
                existingKit.bsp = bsp;
                this.updateBSPKitData(existingKit.serial, bsp);
                resolve();
            } else {
                reject(new Error(`Kit not found: ${kit.serial}`));
            }
        });
    }

    /**
     * Check if any connected kits have outdated firmware
     * 
     * @returns true if any kit needs a firmware update, false otherwise
     */
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

    /**
     * Find a development kit by its serial number
     * 
     * @param serial - Serial number to search for
     * @returns MTBDevKit object if found, undefined otherwise
     */
    public getKitBySerial(serial: string) : MTBDevKit | undefined {
        for(let kit of this.kits) {
            if (kit.serial === serial) {
                return kit ;
            }
        }

        return undefined ;
    }

    /**
     * Update firmware for a specific development kit
     * 
     * Uses the fw-loader tool to update the firmware on the specified kit.
     * Shows progress notification to the user during the update process.
     * 
     * @param serial - Serial number of the kit to update
     */
    public updateFirmware(serial: string) {
        let options: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: "ModusToolbox: ",
            cancellable: false
        };
    
        // TODO: move this progress indicator to the kit display
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
                    let opt : MTBRunCommandOptions = {
                        toolspath: this.ext.toolsDir,
                    } ;
                    ModusToolboxEnvironment.runCmdCaptureOutput(this.ext.logger, fwload, args, opt)
                        .then((result) => {
                            this.scanForDevKits()
                            .then((st: boolean) => {
                                this.emit('updated') ;
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

    /**
     * Update firmware for all connected KitProg3 development kits
     * 
     * Uses the fw-loader tool to update firmware on all connected KitProg3 kits
     * in a single operation. Shows progress notification during the update.
     */
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

                let runopts: MTBRunCommandOptions = {
                    toolspath: this.ext.toolsDir,
                } ;
                ModusToolboxEnvironment.runCmdCaptureOutput(this.ext.logger, fwload, args, runopts)
                .then((result) => {
                    this.scanForDevKits()
                    .then((st: boolean) => {
                        this.emit('updated') ;                        
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

    /**
     * Check if fw-loader output indicates no connected devices
     * 
     * @param output - Exit code and output lines from fw-loader command
     * @returns true if no devices are connected, false otherwise
     */
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

    /**
     * Scan for connected development kits
     * 
     * Uses the fw-loader tool to detect all connected development kits,
     * extracts their properties, and updates the internal kit list.
     * Prevents concurrent scanning operations.
     * 
     * @returns Promise<boolean> that resolves to true when scanning completes
     */
    public scanForDevKits() : Promise<boolean> {
        let ret: Promise<boolean> = new Promise<boolean>((resolve, reject) => {
            // Prevent concurrent scanning operations
            if (this.scanning) {
                resolve(true) ;
                return ;
            }
            this.scanning = true ;            
            this.kits = [] ;
            (async() => {
                // Find the fw-loader tool executable
                let fwload = this.findFWLoader() ;
                if (fwload === undefined) {
                    this.scanning = false ;
                    reject(new Error('Could not find fw-loader tool.')) ;
                    return ;
                }

                // Request device list from fw-loader
                let args: string[] = ["--device-list"] ;

                let opts : MTBRunCommandOptions = {
                    toolspath: this.ext.toolsDir,
                };
                ModusToolboxEnvironment.runCmdCaptureOutput(this.ext.logger, fwload, args, opts)
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
                                this.emit('updated') ;
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

    /**
     * Extract serial number from fw-loader device listing line
     * 
     * @param line - Device listing line from fw-loader output
     * @returns Serial number (first 16 characters)
     */
    private extractSerial(line: string) : string {
        return line.substring(0, 16) ;
    }

    /**
     * Extract firmware version from fw-loader device listing line
     * 
     * @param line - Device listing line containing version information
     * @returns Version string in format "x.y.z" or "?.?.?" if not found
     */
    private extractVersion(line: string) : string {
        let ret: string = "?.?.?" ;
        let result = MTBDevKitMgr.vmatch.exec(line) ;
        if (result) {
            ret = result[0] ;
        }
        return ret;
    }

    /**
     * Extract and create a single development kit from fw-loader output line
     * 
     * Parses a single line from fw-loader device listing to extract kit information
     * including serial number, version, mode, and type. Then retrieves detailed
     * kit properties and adds it to the kit list.
     * 
     * @param line - Single device line from fw-loader --device-list output
     * @returns Promise that resolves when kit extraction is complete
     */
    private async extractOneKit(line: string) : Promise<void> {
        let ret: Promise<void> = new Promise<void>((resolve, reject) => { 
            (async () => {
                let kptype: string = "?" ;
                let outdated: boolean = false ;
                let serial: string = "" ;
                let mode: string = "" ;
                let version: string = "" ;
                let found: boolean = false ;

                // Parse the line to identify kit connection mode and extract serial/version
                for(let tag of MTBDevKitMgr.tags) {
                    let index = line.indexOf(tag) ;
                    if (index !== -1) {
                        serial = this.extractSerial(line.substring(index + tag.length));
                        version = this.extractVersion(line) ;
                        // Determine connection mode from tag type
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
                    // Check for firmware status and programmer type
                    if (line.indexOf('outdated') !== -1) {
                        outdated = true ;
                    }

                    if (line.indexOf('KitProg3') !== -1) {
                        kptype = 'kp3' ;
                    }
                    else if (line.indexOf('KitProg2') !== -1) {
                        kptype = 'kp2' ;
                    }

                    // Check if this kit is already known (could be reconnected)
                    let kit: MTBDevKit | undefined = this.getKitBySerial(serial) ;
                    if (kit === undefined) {
                        // New kit - create and get detailed information
                        kit = new MTBDevKit(kptype, serial, mode, version, outdated) ;
                        try {
                            await this.getKitDetails(kit) ;
                            kit.bsp = this.getBSPForSerial(kit) ;
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
                        // Existing kit - update status (could have been updated)
                        kit.outdated = outdated ;
                        kit.present = true ;
                        resolve();
                    }
                }
            })() ;
        }) ;

        return ret;
    }

    /**
     * Extract text content after a specific tag from a line
     * 
     * @param tag - Tag string to search for
     * @param line - Line containing the tag and content
     * @returns Trimmed content after the tag
     */
    private extractAfter(tag:string, line: string) : string {
        return line.substring(tag.length).trim() ;
    }

    /**
     * Parse detailed kit information from fw-loader --info output
     * 
     * Extracts all available kit properties from the detailed info lines
     * and populates the MTBDevKit object with this information.
     * 
     * @param kit - Kit object to populate with detailed information
     * @param lines - Output lines from fw-loader --info command
     * @returns true if parsing was successful
     */
    private extractKitDetails(kit: MTBDevKit, lines: string[]) : boolean {
        // Parse each line for specific kit property tags
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
                // Parse board features as comma-separated list
                kit.boardFeatures = this.extractAfter(MTBDevKitMgr.theBoardFeatures, line).split(',');
            }
        }

        return true ;
    }

    /**
     * Retrieve detailed information for a specific development kit
     * 
     * Uses the fw-loader --info command to get comprehensive details about
     * a kit including name, silicon ID, target info, and various properties.
     * This information is then parsed and stored in the kit object.
     * 
     * @param kit - Kit object to populate with detailed information
     * @returns Promise that resolves when kit details are retrieved
     */
    private async getKitDetails(kit: MTBDevKit) : Promise<void> {
        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
            let fwload = this.findFWLoader() ;
            if (fwload === undefined) {
                reject(new Error('Could not find fw-loader tool.')) ;
                return ;
            }
            let args: string[] = [ "--info", kit.serial] ;

            let opts : MTBRunCommandOptions = {
                toolspath: this.ext.toolsDir,
            } ;
            //
            ModusToolboxEnvironment.runCmdCaptureOutput(this.ext.logger, fwload, args, opts)
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

    /**
     * Extract and create development kit objects from fw-loader output
     * 
     * Processes the output lines from fw-loader --device-list command to
     * identify and create MTBDevKit objects for all detected kits. Also
     * removes any kits that are no longer present.
     * 
     * @param lines - Output lines from fw-loader --device-list command
     * @returns Promise that resolves when all kit extraction is complete
     */
    private async extractKits(lines: string[]) : Promise<void> {
        let ret: Promise<void> = new Promise<void>((resolve, reject) => { 
            (async() => { 
                this.kits = [] ;
                
                // Process each line to extract kit information
                for(let line of lines) {
                    if (MTBDevKitMgr.kitLineMatch.test(line)) {
                        await this.extractOneKit(line);
                    }
                }

                // Remove any kits that are no longer present
                let i: number = 0 ;
                while (i < this.kits.length) {
                    if (this.kits[i].present) {
                        i++ ;
                    }
                    else {
                        this.kits.splice(i, 1) ;
                    }
                }        
                resolve() ;
            })() ;
        }) ;

        return ret ;
    }

    /**
     * Locate the fw-loader tool executable in the ModusToolbox installation
     * 
     * Searches the ModusToolbox tools database for the fw-loader tool using
     * its GUID and returns the full path to the executable. Performs validation
     * to ensure the tool and its properties are available.
     * 
     * @returns Full path to fw-loader executable, or undefined if not found
     */
    private findFWLoader() : string | undefined {
        let ext = this.ext ;
        if (!ext) {
            this.ext.logger.error('MTBAssistObject is not initialized - cannot find fw-loader.');
            return undefined ;
        }

        let env = ext.env ;
        if (!env) {
            this.ext.logger.error('ModusToolbox environment is not initialized - cannot find fw-loader.');
            return undefined ;
        }

        if (env.isLoading && !env.isLoadingOnlyManifest) {
            this.ext.logger.error('ModusToolbox environment is currently loading (other than manifests) - cannot find fw-loader.');
            return undefined ;
        }

        let fwloader = env.toolsDB.findToolByGUID(MTBDevKitMgr.fwloaderUUID) ;
        if (!fwloader) {
            this.ext.logger.error('ModusToolbox environment does not contain fw-loader tool - cannot find fw-loader.');
            return undefined ;
        }

        // Validate tool properties exist
        if (!fwloader.props) {
            this.ext.logger.error('ModusToolbox environment does not contain properties for fw-loader tool - cannot find fw-loader.');
            return undefined ;
        }

        // Validate programs list exists
        if (!fwloader.props.opt || !fwloader.props.opt.programs) {
            this.ext.logger.error('ModusToolbox environment does not contain programs for fw-loader tool - cannot find fw-loader.');
            return undefined ;
        }

        // Find the specific fw-loader program executable
        for(let pgm of fwloader.props.opt.programs) {
            if (pgm.id === MTBDevKitMgr.fwloaderProgramUUID) {
                let ret = path.join(fwloader.path, pgm.exe) ;
                return ret;
            }
        }

        this.ext.logger.error('ModusToolbox environment does not contain fw-loader tool - cannot find fw-loader.');
        return undefined ;        
    }

    /**
     * Save kit BSP mappings to persistent storage
     * 
     * Serializes the current kit-to-BSP mappings and stores them in
     * VS Code's global state for persistence across sessions.
     */
    private storeKitBSPData() : void {
        let str = JSON.stringify(this.devkitBsp);
        this.ext.context.globalState.update('mtbdevkitbsp', str);
    }

    /**
     * Load kit BSP mappings from persistent storage
     * 
     * Retrieves previously saved kit-to-BSP mappings from VS Code's
     * global state and deserializes them for use.
     */
    private loadBSPSKitData() : void {
        let str = this.ext.context.globalState.get('mtbdevkitbsp', '') ;
        if (str) {
            try {
                this.devkitBsp = JSON.parse(str);
            } catch (e) {
                this.ext.logger.error('Failed to parse devkitBsp data: ' + e);
            }
        }
    }

    /**
     * Get the BSP identifier for a development kit
     * 
     * Determines the appropriate BSP for a kit using a two-tier approach:
     * 1. First checks for explicitly saved BSP mappings by serial number
     * 2. Falls back to using the kit name as the BSP identifier
     * 
     * @param kit - Development kit to get BSP for
     * @returns BSP identifier string, or undefined if none found
     */
    private getBSPForSerial(kit: MTBDevKit) : string | undefined {
        // Check for explicitly saved BSP mapping by serial number (highest priority)
        for(let pair of this.devkitBsp) {
            if (pair[0] === kit.serial) {
                return pair[1] ;
            }
        }

        // Fall back to kit name as BSP identifier
        return kit.name ;
    }

    /**
     * Load BSP mapping configuration from external file
     * 
     * Reads the bspmapping.json file which contains mappings between
     * kit names and their valid BSP choices. This configuration helps
     * filter BSP options to only show compatible choices for each kit.
     * 
     * @returns Array of kit name to BSP mappings
     */
    private loadBSPMapping() : DevKitName2BSPMapping[] {
        let ret: DevKitName2BSPMapping[] = [] ;
        // Look for BSP mapping file in the content directory
        let p = path.join(__dirname, '..', 'content', 'bspmapping.json') ;
        if (fs.existsSync(p)) {
            let data = fs.readFileSync(p, 'utf8') ;
            try {
                ret = JSON.parse(data) ;
            }
            catch (err) {
                this.ext.logger.error('Failed to parse bspmapping JSON:', (err as Error).message);
            }
        }

        return ret;
    }
}