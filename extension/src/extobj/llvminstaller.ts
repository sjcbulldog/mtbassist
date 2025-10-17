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

import fetch from 'node-fetch';
import * as winston from 'winston';
import * as fs from 'fs' ;
import * as os from 'os' ;
import * as path from 'path' ;
import * as tar from 'tar' ;
import { EventEmitter } from 'stream';
import { ModusToolboxEnvironment } from '../mtbenv';
import { InstallLLVMProgressMsg } from '../comms';

// TODO: read a JSON file from mewserver.org to add possible new versions and URLs.
interface LLVMUrls {
    win32? : string[] ;
    darwin? : string[] ;
    linux? : string[] ;
    all? : string[] ;
}

/**
 * LLVMInstaller - Downloads and installs LLVM embedded toolchain for ARM development
 * 
 * This class handles the download and installation of the LLVM embedded toolchain
 * for ARM processors from the official ARM GitHub releases. It supports multiple
 * platforms (Windows, macOS, Linux) and provides progress reporting through events.
 * The installer downloads both the main compiler toolchain and the newlib runtime
 * library overlay, extracting them to the specified installation directory.
 */
export class LLVMInstaller extends EventEmitter {

    private static readonly llvmVersionsUrl = 'https://www.mewserver.org/vscode/llvmversions.json' ;

    /** 
     * Static mapping of LLVM versions to their download URLs for different platforms
     * Each version contains platform-specific URLs (win32, darwin, linux) and 'all' for cross-platform files
     */
    private static llvmURLs : any ;

    /** Logger instance for recording installation progress and errors */
    private logger_: winston.Logger ;    
    
    /** Path where LLVM was successfully installed */
    private installPath_: string = '' ;

    /**
     * Constructor - Initialize the LLVM installer
     * 
     * @param logger - Winston logger instance for recording installation progress
     */
    constructor(logger: winston.Logger) {
        super() ;
        this.logger_ = logger;
    }

    public get copyright() : string {
        return LLVMInstaller.llvmURLs['copyright'] || 'https://github.com/arm/arm-toolchain?tab=License-1-ov-file' ;
    }

    private static readFallbackList(logger: winston.Logger) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let p = path.join(__dirname, '..', 'content', 'llvmversions.json') ;    
            fs.readFile(p, 'utf8', (err, data) => {
                if (err) {
                    logger.error(`Failed to read fallback llvmversions.json: ${err}`) ;
                    reject(err) ;
                    return ;
                }
                try {
                    LLVMInstaller.llvmURLs = JSON.parse(data) ;
                    logger.debug(`Using fallback llvmversions.json with ${Object.keys(LLVMInstaller.llvmURLs).length} versions`);
                    resolve() ;
                }
                catch(err) {
                    logger.error(`Failed to parse fallback llvmversions.json: ${err}`) ;
                    reject(err) ;
                }
            }) ;
        }) ;
        return ret ;
    }

    private static fetchLlvmURLs(logger: winston.Logger) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            logger.debug(`Starting download from ${LLVMInstaller.llvmVersionsUrl}`);
            fetch(LLVMInstaller.llvmVersionsUrl)
            .then(response => {
                if (!response.ok) {
                    logger.error(`Failed to download ${LLVMInstaller.llvmVersionsUrl}: ${response.statusText} - using fallback llvm list`);  
                    this.readFallbackList(logger)
                    .then(() => resolve())
                    .catch(err => reject(err)) ;
                    return ;
                }
                else {
                    response.json()
                    .then(data => {
                        LLVMInstaller.llvmURLs = data as any ;
                        logger.debug(`Downloaded llvmversions.json with ${Object.keys(LLVMInstaller.llvmURLs).length} versions`);
                        resolve() ;
                    })
                    .catch(err => {
                        logger.error(`Failed to parse JSON from ${LLVMInstaller.llvmVersionsUrl}: ${err} - using fallback llvm list`);  
                        this.readFallbackList(logger)
                        .then(() => resolve())
                        .catch(err => reject(err)) ;
                    }) ;
                }
            }) ;
        }) ;
        return ret ;
    }

    /**
     * Get the path where LLVM was installed
     * 
     * @returns The installation path, or empty string if not yet installed
     */
    public get installPath() : string {
        return this.installPath_ ;
    }

    /**
     * Get list of available LLVM versions that can be installed
     * 
     * @returns Array of version strings available for installation
     */
    public static getAvailableVersions(logger: winston.Logger) : Promise<string[]> {
        let ret = new Promise<string[]>((resolve, reject) => {
            this.fetchLlvmURLs(logger)
            .then(() => {
                let versions : string[] = [] ;
                for(let ver of Object.keys(LLVMInstaller.llvmURLs)) {
                    if (ver === 'copyright') {
                        continue ;
                    }
                    let obj = LLVMInstaller.llvmURLs[ver as keyof typeof LLVMInstaller.llvmURLs] as LLVMUrls ;
                    let url = obj[process.platform as keyof typeof obj] ;
                    if (url && url.length > 0 && obj.all && obj.all.length > 0) {
                        versions.push(ver) ;
                    }
                }
                resolve(versions) ;
            });
        });
        return ret ;
    }

    /**
     * Install LLVM embedded toolchain for ARM
     * 
     * Downloads and installs the specified version of LLVM embedded toolchain
     * to the given path. The installation includes both the main compiler
     * toolchain and the newlib runtime library overlay. Progress is reported
     * through 'progress' events.
     * 
     * @param version - LLVM version to install (must be in llvmURLs)
     * @param path - Directory path where LLVM should be installed
     * @returns Promise that resolves when installation is complete
     */
    public install(version: string, path: string) : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let msg : InstallLLVMProgressMsg = { error: false, messages: ['Starting installation...'] } ;
            this.emit('progress', msg) ;
            this.logger_.debug(`Starting LLVM installation: version=${version}, path=${path}`);
            this.logger_.debug(`    Platform: ${process.platform}, Arch: ${process.arch}`);
            
            // Log all URLs that will be downloaded for this version
            for(let url of this.getURLsForVersion(version)) {
                this.logger_.debug(`    URL: ${url}`);
            }

            // Download all required files first, then install them
            this.downloadLLVM(this.logger_, version)
            .then((files) => {
                this.installLLVM(this.logger_, version, path, files)
                .then(() => {
                    msg = { error: false, messages: ['Installation completed successfully.'] } ;
                    this.emit('progress', msg) ;
                    this.logger_.info(`LLVM installation completed: version=${version}, path=${path}`);
                    resolve();
                })
                .catch(err => {
                    this.logger_.error(`LLVM installation failed: ${err}`);
                    reject(err);
                }) ;
            })
            .catch(err => {
                msg = { error: true, messages: ['Installation failed. See log for details.'] } ;
                this.logger_.error(`LLVM download failed: ${err}`);
                reject(err);
            }) ;
        });
    }

    /**
     * Get download URLs for a specific LLVM version and current platform
     * 
     * Retrieves the appropriate download URLs based on the current platform
     * (process.platform) and includes both platform-specific and universal files.
     * 
     * @param version - LLVM version to get URLs for
     * @returns Array of download URLs for the specified version
     */
    private getURLsForVersion(version: string) : string[] {
        let ret: string[] = [] ;
        if (version in LLVMInstaller.llvmURLs) {
            let obj =  LLVMInstaller.llvmURLs[version as keyof typeof LLVMInstaller.llvmURLs] as LLVMUrls | undefined ;
            if (obj) {
                // Add platform-specific URLs (win32, darwin, linux)
                ret = ret.concat(obj[process.platform as keyof typeof obj] || []) ;
                // Add universal files that work on all platforms
                ret = ret.concat(obj.all|| []) ;
            }
        }

        return ret ;
    }

    /**
     * Download a file from URL to local destination with progress reporting
     * 
     * Downloads a file using node-fetch and provides progress updates through
     * events. Handles streaming download with progress percentage calculation
     * based on content-length header.
     * 
     * @param url - URL to download from
     * @param destPath - Local file path to save the downloaded content
     * @returns Promise that resolves when download is complete
     */
    private downloadFile(url: string, destPath: string) : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let name = path.basename(destPath) ;
            this.logger_.debug(`Starting download from ${url} to ${destPath}`);
            fetch(url).then(response => {
                if (!response.ok) {
                    this.logger_.error(`Failed to download ${url}: ${response.statusText}`);
                    reject(new Error(`Failed to download ${url}: ${response.statusText}`));
                    return;
                }
                
                // Set up progress tracking
                const totalSize = parseInt(response.headers.get('content-length') || '0', 10);
                let downloadedSize = 0;
                const fileStream = fs.createWriteStream(destPath);
                
                if (response.body) {
                    // Track download progress
                    response.body.on('data', (chunk) => {
                        downloadedSize += chunk.length;
                        const percent = totalSize ? ((downloadedSize / totalSize) * 100).toFixed(2) : '0';
                        this.emit('progress', { file: name, percent: parseFloat(percent) }) ;
                    });

                    // Handle successful completion
                    fileStream.on('finish', () => {
                        fileStream.close();
                        this.emit('complete', { file: name }) ;
                        this.logger_.debug(`Download completed: ${destPath}`);
                        resolve();
                    });

                    // Handle download errors
                    response.body?.on('error', (err) => {
                        this.emit('error', { file: name, error: err }) ;
                        this.logger_.error(`Error during download from ${url}: ${err}`);
                        reject(err);
                    }) ; 

                    // Start the download stream
                    response.body.pipe(fileStream);
                }
                else {
                    this.emit('error', { file: name, error: new Error('No response body') }) ;
                    this.logger_.error(`No response body for ${url}`);
                    reject(new Error('No response body'));
                }
            }) ;
        }) ;
    }

    /**
     * Extract the target directory name from a ZIP archive
     * 
     * Examines the first entry in the ZIP file to determine the root directory
     * structure. This is used to identify where LLVM will be extracted.
     * 
     * @param zip - AdmZip object representing the downloaded ZIP file
     * @returns Root directory name from the ZIP structure, or undefined if no entries
     */
    private getTargetDirFromZip(zip: any) : string | undefined {
        let ret : string | undefined = undefined ;

        // Get all entries from the ZIP archive
        let admZip = require('adm-zip') ;
            
        let entries = zip.getEntries() ;
        if (entries.length > 0) {
            // Use the first entry to determine the root directory structure
            let entry = entries[0] ;
            ret = path.dirname(entry.entryName) ;
        }
        return ret ;
    }

    private async getTargetDirFromTar(tarballFilename: string) : Promise<string | undefined> {
        let ret = new Promise<string | undefined>(async (resolve, reject) => {
            let answer: string | undefined = undefined ;
            const filenames: string [] = [] ;
            await tar.t({
                file: tarballFilename,
                onReadEntry: (entry: any) => filenames.push(entry.path)
            }) ;
            if (filenames.length > 0) {
                answer = filenames[0] ;
                while (path.dirname(answer) !== '.' ) {
                    answer = path.dirname(answer) ;
                }
            }
            resolve(answer) ;
        }) ;
        return ret;
    }

    /**
     * Install LLVM on Windows platform by extracting ZIP files
     * 
     * Handles Windows-specific installation process including ZIP file extraction
     * and directory creation. Processes multiple files if needed.
     * 
     * @param tpath - Target installation path
     * @param file - Downloaded ZIP file to extract
     * @param probePath - if true, probe and return the top most path for the archive
     * @param msgstr - Optional progress message to emit
     * @returns Promise that resolves when installation is complete
     */
    private installLLVMZip(tpath: string, file: string, probePath: boolean, msgstr?: string) : Promise<string | undefined> {
        return new Promise<string | undefined>((resolve, reject) => {

            let admZip = require('adm-zip') ;
            
            // Extract the main LLVM compiler package
            let zip = new admZip(file) ;
            let targetDir : string | undefined ;
            
            if (probePath) {
                targetDir = this.getTargetDirFromZip(zip) ;
                if (!targetDir) {
                    reject(new Error('Could not determine target directory from zip file')) ;
                    return ;
                }
            }

            // Notify progress and extract compiler
            if (msgstr) {
                let msg : InstallLLVMProgressMsg = { error: false, messages: [msgstr] } ;
                this.emit('progress', msg) ;            
            }
            zip.extractAllTo(tpath, true) ;
            resolve(targetDir) ;
        }) ;
    }

    /**
     * Install LLVM on macOS platform by mounting DMG files and copying contents
     * 
     * Handles macOS-specific installation process including DMG mounting,
     * directory copying, and cleanup. Uses hdiutil for DMG operations.
     * 
     * @param ppath - Target installation path
     * @param files - Array of downloaded DMG files to process
     * @returns Promise that resolves when installation is complete
     */
    private installLLVMDmg(ppath: string, file: string, probePath: boolean, msgstr?: string) : Promise<string | undefined> {
        let msg : InstallLLVMProgressMsg ;
        return new Promise<string | undefined>((resolve, reject) => {
            if (msgstr) {
                msg = { error: false, messages: [msgstr] } ;
                this.emit('progress', msg) ;
            }
            ModusToolboxEnvironment.runCmdCaptureOutput(this.logger_, 'hdiutil', ['attach', '-nobrowse', '-readonly', file], {})
            .then(result => {
                if (result[0] !== 0) {
                    let msg = result[1].join('\n') ;
                    reject(new Error(`Failed to mount DMG: ${msg}`)) ;
                    return ;
                }

                let i = -1 ;
                let line: string | undefined ;
                for(let index = result[1].length - 1 ; index >= 0 ; --index) {
                    line = result[1][index] ;
                    i = line.indexOf('/Volumes/') ;
                    if (i !== -1 ) {
                        break ;
                    }
                }

                if (!line) {
                    reject(new Error('Invalid output from hdiutil command')) ;
                    return ;
                }

                let mountPoint = line.substring(i).trim() ;
                this.logger_.debug(`Mounted DMG at ${mountPoint}`) ;
                let dirname = path.basename(mountPoint) ;
                let tpath = path.join(ppath, dirname) ;
                let srcdir = path.join(mountPoint, dirname) ;
                ModusToolboxEnvironment.runCmdCaptureOutput(this.logger_, 'cp', ['-R', srcdir, ppath], {})
                .then(result => {
                    if (result[0] !== 0) {
                        let msg = result[1].join('\n') ;
                        reject(new Error(`Failed to copy files from DMG: ${msg}`)) ;
                        return ;
                    }
                    this.installPath_ = tpath ;
                    ModusToolboxEnvironment.runCmdCaptureOutput(this.logger_, 'hdiutil', ['detach', mountPoint], {})
                    .then(result => {
                        if (result[0] !== 0) {
                            let msg = result[1].join('\n') ;
                            reject(new Error(`Failed to unmount DMG: ${msg}`)) ;
                            return ;
                        }
                        let ret : string | undefined = probePath ? tpath : undefined ; 
                        resolve(ret) ;
                    })
                    .catch(err => {
                        reject(err) ;
                        return ;
                    }) ;
                })
                .catch((err) => {
                    reject(err) ;
                    return ;
                }) ;
            })
            .catch(err => {
                reject(err) ;
                return ;
            }) ;
        }) ;
    }

    private decompressTarBall(tarballFilename: string) : Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (tarballFilename.endsWith('.tar')) {
                resolve(tarballFilename) ;
                return ;
            }

            let parsed = path.parse(tarballFilename) ;
            let newfilename = path.join(path.dirname(tarballFilename), parsed.name) ;

            if (fs.existsSync(newfilename)) {
                fs.unlinkSync(newfilename) ;
            }

            ModusToolboxEnvironment.runCmdCaptureOutput(this.logger_, '/usr/bin/xz', ['--decompress', tarballFilename], {})
            .then(result => {
                if (result[0] !== 0) {
                    let msg = result[1].join('\n') ;
                    reject(new Error(`Failed to decompress tarball: ${msg}`)) ;
                    return ;
                }
                if (!fs.existsSync(newfilename)) {
                    reject(new Error(`Decompressed file not found: ${newfilename}`)) ;
                    return ;
                }
                resolve(newfilename) ;
            })
            .catch(err => {
                reject(err) ;
            }) ;    
        }) ;
    }

    /**
     * Install LLVM on Linux platform
     * 
     * Currently a placeholder implementation for Linux support.
     * Linux installations may require different handling than Windows/macOS.
     * 
     * @param path - Target installation path
     * @param files - Array of downloaded files for Linux
     * @returns Promise that resolves immediately (placeholder)
     */
    private installLLVMTar(tpath: string, file: string, probePath: boolean, msgstr?: string) : Promise<string | undefined   > {
        let msg : InstallLLVMProgressMsg ;    
        let targetDir: string | undefined ;    
        return new Promise<string | undefined>(async (resolve, reject) => {
            msg = { error: false, messages: ['Decompressing file'] } ;
            this.emit('progress', msg) ;

            this.decompressTarBall(file)
            .then(async (tarfile) => {                
                // Extract the main LLVM compiler package

                if (probePath) {
                    let targetDir = await this.getTargetDirFromTar(tarfile) ;
                    if (!targetDir) {
                        reject(new Error('Could not determine target directory from tar file')) ;
                        return ;
                    }
                }

                // Notify progress and extract compiler
                if(msgstr) {
                    msg = { error: false, messages: [msgstr] } ;
                    this.emit('progress', msg) ;            
                }
                tar.x({
                    file: tarfile,
                    C: tpath,
                    sync: true
                }) ;
                resolve(targetDir) ;
            })
            .catch(err => {
                reject(err) ;
            }) ;
        }) ;
    }

    /**
     * Platform-specific LLVM installation dispatcher
     * 
     * Routes installation to the appropriate platform-specific method based on
     * the current operating system. Supports Windows, macOS, and Linux.
     * 
     * @param logger - Winston logger instance for debug output
     * @param version - LLVM version being installed
     * @param ipath - Target installation directory path
     * @param files - Array of downloaded installation files
     * @returns Promise that resolves when installation completes
     * @throws Error if the current platform is not supported
     */
    private installLLVM(logger: winston.Logger, version: string, ipath: string, files: string[]) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            //
            // The convention is that there are two files in the files array.  The first one is the compiler and its format is 
            // platform dependent.  The second one is always the newlib overlay in ZIP format.
            //
            let p : Promise<string | undefined> ;
            if (files[0].endsWith('.zip')) {
                // Windows ZIP installation
                p = this.installLLVMZip(ipath, files[0], true, 'Installing LLVM compiler ...') ;
            }
            else if (files[0].endsWith('.dmg')) {
                // macOS DMG installation
                p = this.installLLVMDmg(ipath, files[0], true, 'Installing LLVM compiler ...') ;
            }
            else if (files[0].endsWith('.tar.xz') || files[0].endsWith('.tar')) {
                // Linux tarball installation
                p = this.installLLVMTar(ipath, files[0], true, 'Installing LLVM compiler ...') ;
            }
            else {
                reject(new Error(`Unsupported file format for installation`)) ;
            }

            p!.then((dest: string | undefined) => {
                if (!dest) {
                    reject(new Error('Could not determine installation directory')) ;
                    return ;
                }
                this.installLLVMZip(path.join(ipath, dest), files[1], false, 'Installing LLVM newlib library ...')
                .then(() => {
                    this.installPath_ = path.join(ipath, dest) ;
                    resolve() ;
                }).catch(err => {
                    reject(err) ;
                }) ;
            })
            .catch(err => {
                reject(err) ;
            }) ;
        }) ;
        return ret ;
    }

    /**
     * Download LLVM installation files for the specified version
     * 
     * Downloads all required LLVM files (compiler, newlib library) for the current
     * platform. Creates temporary directory for downloads and manages progress reporting.
     * 
     * @param logger - Winston logger instance for debug output
     * @param version - LLVM version to download (e.g., "17.0.0")
     * @returns Promise resolving to array of downloaded file paths
     * @throws Error if download fails or version not available
     */
    private downloadLLVM(logger: winston.Logger, version: string) : Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            let ret: string[] = [] ;
            logger.debug(`Starting LLVM download: version=${version}, path=${path}`);
            let msg : InstallLLVMProgressMsg = { error: false, messages: ['Downloading compiler and newlib runtime library...'] } ;
            this.emit('progress', msg) ;

            // Create download promises for all required files
            let arr: Promise<void>[] = [] ;
            for(let url of this.getURLsForVersion(version)) {
                let parts = url.split('/') ;
                if (parts.length > 0) {
                    // Download to temporary directory
                    let p = path.join(os.tmpdir(), parts[parts.length - 1]) ;
                    ret.push(p) ;
                    arr.push(this.downloadFile(url, p));
                }
            }

            // Wait for all downloads to complete
            Promise.all(arr).then(() => {
                msg = { error: false, messages: ['Download completed successfully.'] } ;
                this.emit('progress', msg) ;
                resolve(ret);
            }).catch(err => {
                reject(err);
            }) ;            
        }) ;
    }
}
