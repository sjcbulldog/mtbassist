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
import * as fs from 'fs' ;

/**
 * DeviceDBManager - Manages access to ModusToolbox device database information
 * 
 * This class provides a structured interface to the ModusToolbox device database,
 * which contains information about supported devices, their properties, and
 * associated file paths. The device database is organized hierarchically with
 * device-specific directories containing various views and configurations.
 */
export class DeviceDBManager {
    /** Standard filename for device database properties */
    private static readonly devicePropsFile = 'props.json' ;
    
    /** Base directory containing the device database */
    private basedir_ : string ;
    
    /** Parsed properties from the device database props.json file */
    private props_ : any = null ;

    /**
     * Constructor - Initialize DeviceDBManager with base directory
     * @param dir - Base directory path containing the device database
     */
    public constructor(dir: string) {
        this.basedir_ = dir ;
    }

    /**
     * Initialize the device database by loading and validating the props.json file
     * 
     * Reads the device database properties file and validates that it contains
     * the required structure including 'devicedb', 'opt', and 'devicedb-index' entries.
     * The devicedb-index contains an array of device entries with name and path information.
     * 
     * @returns Promise<boolean> - Resolves to true if initialization succeeds
     * @throws Error if props.json is missing, unreadable, or has invalid structure
     */
    public initialize() : Promise<boolean> {
        return new Promise((resolve, reject) => {
            // Construct path to the device database properties file
            let props = path.join(this.basedir_, DeviceDBManager.devicePropsFile) ;
            if (!fs.existsSync(props)) {
                reject(new Error(`device-db property file not found: ${props}`)) ;
                return ;
            }

            // Read and parse the properties file asynchronously
            let data = fs.readFile(props, 'utf8', (err, data) => {
                if (err) {
                    reject(new Error(`error reading device-db property file: ${err.message}`)) ;
                    return ;
                }
                try {
                    // Parse JSON and validate required structure
                    this.props_ = JSON.parse(data) ;
                    
                    // Validate required top-level 'devicedb' property
                    if (!this.props_.devicedb) {
                        reject(new Error(`invalid device-db: property file missing 'devicedb' entry`)) ;
                        return ;
                    }

                    // Validate required 'opt' section
                    if (!this.props_.opt) {
                        reject(new Error(`invalid device-db: property file missing 'opt' entry`)) ;
                        return ;
                    }

                    // Validate required device index for device lookup
                    if (!this.props_.opt['devicedb-index']) {
                        reject(new Error(`invalid device-db: property file missing 'opt/devicedb-index' entry`)) ;
                        return ;
                    } 
                } catch(e) {
                    // Handle JSON parsing errors
                    reject(new Error(`error parsing device-db property file: ${e}`)) ;
                    return ;
                }
                // Initialization successful
                resolve(true) ;
            });
        }) ;
    }

    /**
     * Get device-specific view paths for a given part number
     * 
     * Searches the device database for the specified part number (MPN) and returns
     * an array of directory paths that contain the requested view. The search walks
     * up the device directory hierarchy to find all applicable view directories,
     * allowing for inheritance of device configurations.
     * 
     * @param mpn - Manufacturer Part Number (device identifier)
     * @param view - View type (e.g., 'svd', 'linker_scripts', 'headers')
     * @returns Array of directory paths containing the view, or null if device not found
     */
    public getDevicePaths(mpn: string, view: string) : string[] | null {
        // Find the base device directory for the given part number
        let devdir = this.findDeviceDir(mpn) ;
        if (!devdir) {
            return null ;
        }

        let dirs: string[] = [] ;
        
        // Walk up the directory hierarchy to collect all view directories
        // This allows for inheritance where child devices can inherit views from parent devices
        while (devdir !== this.basedir_) {
            let viewdir = path.join(devdir, view) ;
            // Only include directories that actually exist
            if (fs.existsSync(viewdir) && fs.statSync(viewdir).isDirectory()) {
                dirs.push(viewdir) ;
            }
            // Move up one directory level
            devdir = path.dirname(devdir) ;
        }

        // Return the collected directories, or null if none found
        return dirs.length ? dirs : null ;
    }

    /**
     * Find the base directory for a specific device by part number
     * 
     * Searches the device database index for an entry matching the given
     * manufacturer part number (MPN) and returns the full path to that
     * device's directory within the database.
     * 
     * @param mpn - Manufacturer Part Number to search for
     * @returns Full path to device directory, or null if device not found
     */
    private findDeviceDir(mpn: string) : string | null {
        // Get the device index from the loaded properties
        let devices = this.props_.opt['devicedb-index'] ;
        
        // Search for a device entry with matching name
        let device = devices.find((entry: any) => entry.name === mpn) ;
        if (!device) {
            return null ;
        }

        // Return the full path by joining base directory with device path
        return path.join(this.basedir_, device.path) ;
    }
}
