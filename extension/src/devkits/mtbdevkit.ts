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

import { DevKitInfo } from "../comms";

/**
 * MTBDevKit - Represents a ModusToolbox development kit (hardware board)
 * 
 * This class encapsulates all the properties and information about a physical
 * ModusToolbox development kit, including hardware specifications, firmware details,
 * connectivity options, and board-specific features. It serves as a data model
 * for development kits that can be connected via USB and programmed using
 * ModusToolbox tools.
 */
export class MTBDevKit {
    /** KitProg programmer type (e.g., "KitProg3", "KitProg2") */
    public readonly kptype: string ;
    
    /** Unique serial number identifying this specific kit */
    public readonly serial : string ;
    
    /** USB connection mode */
    public readonly mode: string;
    
    /** Firmware version currently installed on the kit */
    public readonly version: string ;
    
    /** Flag indicating if the firmware is outdated and needs updating */
    public outdated: boolean ;
    
    /** Human-readable name of the development kit (e.g., "CY8CKIT-062-WIFI-BT") */
    public name: string | undefined ;
    
    /** Silicon/chip identifier for the target MCU on the kit */
    public siliconID: string | undefined ;
    
    /** Detailed information about the target MCU and its capabilities */
    public targetInfo: string | undefined ;
    
    /** Programming interface properties and capabilities */
    public programmingProperties : string | undefined ;
    
    /** Bridging interface capabilities (UART, I2C, SPI, etc.) */
    public bridgingProperties : string | undefined ;
    
    /** KitProg3-specific properties and configurations */
    public kitProg3Properties: string | undefined ;
    
    /** QSPI (Quad Serial Peripheral Interface) properties for external memory */
    public qspiProperties : string | undefined ;
    
    /** Available connectivity options (WiFi, Bluetooth, Ethernet, etc.) */
    public connectivityOptions: string | undefined ;
    
    /** FRAM (Ferroelectric RAM) properties if available on the kit */
    public fram: string | undefined ;
    
    /** List of board-specific features and capabilities */
    public boardFeatures: string[] = [] ;
    
    /** Flag indicating if the kit is currently connected and available */
    public present: boolean = true ;
    
    /** Board Support Package (BSP) identifier for this kit */
    public bsp: string | undefined ;

    /**
     * Constructor - Create a new MTBDevKit instance with core identification properties
     * 
     * @param kptype - KitProg programmer type identifier
     * @param serial - Unique serial number of the development kit
     * @param mode - USB connection mode for the kit
     * @param version - Current firmware version installed on the kit
     * @param outdated - Whether the firmware version is outdated
     */
    public constructor(kptype: string, serial: string, mode: string, version: string, outdated: boolean) {
        this.kptype = kptype ;
        this.serial = serial ;
        this.mode = mode;
        this.version = version ;
        this.outdated = outdated;
    }

    /**
     * Generate comprehensive development kit information for UI display
     * 
     * Creates a DevKitInfo object containing all relevant information about this
     * development kit, including its status relative to available BSP choices.
     * This method is typically used when displaying kit information in the UI
     * or when determining kit compatibility with projects.
     * 
     * @param bspChoices - Array of available Board Support Package identifiers
     * @returns DevKitInfo object with complete kit information and status
     */
    public info(bspChoices: string[]) : DevKitInfo {
        return {
            // Use kit name if available, otherwise fall back to serial number
            name: this.name || `Serial ${this.serial}`,
            serial: this.serial,
            firmwareVersion: this.version,
            boardFeatures: this.boardFeatures,
            kitProgType: this.kptype,
            usbMode: this.mode,
            // Parse bridging properties from comma-separated string
            bridgingTypes: this.bridgingProperties ? this.bridgingProperties.split(',') : [],
            fwOutOfDate: this.outdated,
            bsp: this.bsp || '',
            bspChoices: bspChoices,
            // Determine kit availability status based on BSP compatibility
            status: this.getStatus(bspChoices)
        } ;
    }

    /**
     * Determine the availability status of this development kit
     * 
     * Checks whether the kit's BSP (Board Support Package) is available
     * in the provided list of BSP choices. This determines if the kit
     * can be used for development with the current ModusToolbox installation.
     * 
     * @param bspChoices - Array of available BSP identifiers
     * @returns "Available" if BSP is found, "BSP Not Available" otherwise
     */
    private getStatus(bspChoices: string[]) : string {
        // Search for this kit's BSP in the available choices
        let index = bspChoices.findIndex(choice => choice === this.bsp);
        return index !== -1 ? 'Available' : 'BSP Not Available';
    }
} ;