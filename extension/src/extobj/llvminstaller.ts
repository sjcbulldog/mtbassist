import fetch from 'node-fetch';
import * as winston from 'winston';
import * as fs from 'fs' ;
import * as os from 'os' ;
import * as path from 'path' ;
import { EventEmitter } from 'stream';

//
// TODO: read a JSON file from mewserver.org to add possible new versions and URLs.
//

export class LLVMInstaller extends EventEmitter {
    private static llvmURLs = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '19.1.5' : {
            'win32' : [
                'https://github.com/ARM-software/LLVM-embedded-toolchain-for-Arm/releases/download/release-19.1.5/LLVM-ET-Arm-19.1.5-Windows-x86_64.zip'
            ],
            'darwin' : [
                'https://github.com/ARM-software/LLVM-embedded-toolchain-for-Arm/releases/download/release-19.1.5/LLVM-ET-Arm-19.1.5-Darwin-universal.dmg'
            ],
            'linux' : [
                'https://github.com/ARM-software/LLVM-embedded-toolchain-for-Arm/releases/download/release-19.1.5/LLVM-ET-Arm-19.1.5-Linux-AArch64.tar.xz'
            ],
            'all' : [
                'https://github.com/ARM-software/LLVM-embedded-toolchain-for-Arm/releases/download/release-19.1.5/LLVM-ET-Arm-newlib-overlay-19.1.5.zip'
            ]
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention        
        '19.1.1' : {
            'win32' : [
                'https://github.com/ARM-software/LLVM-embedded-toolchain-for-Arm/releases/download/release-19.1.1/LLVM-ET-Arm-19.1.1-Windows-x86_64.zip'
            ],
            'darwin' : [
                'https://github.com/ARM-software/LLVM-embedded-toolchain-for-Arm/releases/download/release-19.1.1/LLVM-ET-Arm-19.1.1-Darwin-universal.dmg'  
            ],
            'linux' : [
                'https://github.com/ARM-software/LLVM-embedded-toolchain-for-Arm/releases/download/release-19.1.1/LLVM-ET-Arm-19.1.1-Linux-AArch64.tar.xz'
            ],
            'all' : [
                'https://github.com/ARM-software/LLVM-embedded-toolchain-for-Arm/releases/download/release-19.1.1/LLVM-ET-Arm-newlib-overlay-19.1.1.zip'
            ]
        }
    } ;

    private logger_: winston.Logger ;    
    private installPath_: string = '' ;

    constructor(logger: winston.Logger) {
        super() ;
        this.logger_ = logger;
    }

    public get installPath() : string {
        return this.installPath_ ;
    }

    public static getAvailableVersions() : string[] {
        return Object.keys(LLVMInstaller.llvmURLs) ;
    }

    public install(version: string, path: string) : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.emit('install-start', { version: version, path: path }) ;
            this.logger_.debug(`Starting LLVM installation: version=${version}, path=${path}`);
            this.logger_.debug(`    Platform: ${process.platform}, Arch: ${process.arch}`);
            for(let url of this.getURLsForVersion(version)) {
                this.logger_.debug(`    URL: ${url}`);
            }

            this.downloadLLVM(this.logger_, version)
            .then((files) => {
                this.installLLVM(this.logger_, version, path, files)
                .then(() => {
                    this.emit('install-complete', { version: version, path: path }) ;
                    this.logger_.info(`LLVM installation completed: version=${version}, path=${path}`);
                    resolve();
                })
                .catch(err => {
                    this.logger_.error(`LLVM installation failed: ${err}`);
                    reject(err);
                }) ;
            })
            .catch(err => {
                this.logger_.error(`LLVM download failed: ${err}`);
                reject(err);
            }) ;
        });
    }

    private getURLsForVersion(version: string) : string[] {
        let ret: string[] = [] ;
        if (version in LLVMInstaller.llvmURLs) {
            let obj =  LLVMInstaller.llvmURLs[version as keyof typeof LLVMInstaller.llvmURLs] ;
            if (obj) {
                ret = ret.concat(obj[process.platform as keyof typeof obj] || []) ;
                ret = ret.concat(obj['all'] || []) ;
            }
        }

        return ret ;
    }

    private downloadFile(url: string, destPath: string) : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let name = path.basename(destPath) ;
            this.logger_.debug(`Starting download from ${url} to ${destPath}`);

            this.emit('start', { file: name }) ;
            fetch(url).then(response => {
                if (!response.ok) {
                    this.logger_.error(`Failed to download ${url}: ${response.statusText}`);
                    reject(new Error(`Failed to download ${url}: ${response.statusText}`));
                    return;
                }
                const totalSize = parseInt(response.headers.get('content-length') || '0', 10);
                let downloadedSize = 0;
                const fileStream = fs.createWriteStream(destPath);
                if (response.body) {
                    response.body.on('data', (chunk) => {
                        downloadedSize += chunk.length;
                        const percent = totalSize ? ((downloadedSize / totalSize) * 100).toFixed(2) : '0';
                        this.emit('progress', { file: name, percent: parseFloat(percent) }) ;
                    });

                    fileStream.on('finish', () => {
                        fileStream.close();
                        this.emit('complete', { file: name }) ;
                        this.logger_.debug(`Download completed: ${destPath}`);
                        resolve();
                    });

                    response.body?.on('error', (err) => {
                        this.emit('error', { file: name, error: err }) ;
                        this.logger_.error(`Error during download from ${url}: ${err}`);
                        reject(err);
                    }) ; 

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

    private getTargetDir(zip: any) : string | undefined {
        let ret : string | undefined = undefined ;

        let entries = zip.getEntries() ;
        if (entries.length > 0) {
            let entry = entries[0] ;
            ret = path.dirname(entry.entryName) ;
        }
        return ret ;
    }

    private installLLVMWindows(tpath: string, files: string[]) : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // We need to unzip the compiler first
            this.logger_.debug(`Installing LLVM on Windows to ${tpath}`);
            for(let file of files) {
                this.logger_.debug(`    File: ${file}`);
            }

            let admZip = require('adm-zip') ;
            let zip = new admZip(files[0]) ;
            let targetDir = this.getTargetDir(zip) ;
            if (!targetDir) {
                reject(new Error('Could not determine target directory from zip file')) ;
                return ;
            }

            
            zip.extractAllTo(tpath, true) ;
            this.logger_.debug(`LLVM compiler installation on Windows completed to ${tpath}`);

            zip = new admZip(files[1]) ;
            this.installPath_ = path.join(tpath, targetDir) ;
            zip.extractAllTo(this.installPath_, true) ;
            this.logger_.debug(`LLVM newlib overlay installation on Windows completed to ${this.installPath_}`);

            resolve() ;
        }) ;
    }

    private installLLVMMacOs(path: string, files: string[]) : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            resolve() ;
        }) ;
    }

    private installLLVMLinux(path: string, files: string[]) : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            resolve() ;
        }) ;
    }

    private installLLVM(logger: winston.Logger, version: string, path: string, files: string[]) : Promise<void> {
        switch(process.platform) {
            case 'win32':
                return this.installLLVMWindows(path, files) ;
            case 'darwin':
                return this.installLLVMMacOs(path, files) ;
            case 'linux':
                return this.installLLVMLinux(path, files) ;
            default:
                return Promise.reject(new Error(`Unsupported platform: ${process.platform}`)) ;
        }
    }

    private downloadLLVM(logger: winston.Logger, version: string) : Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            let ret: string[] = [] ;
            logger.debug(`Starting LLVM download: version=${version}, path=${path}`);

            let arr: Promise<void>[] = [] ;
            for(let url of this.getURLsForVersion(version)) {
                let parts = url.split('/') ;
                if (parts.length > 0) {
                    let p = path.join(os.tmpdir(), parts[parts.length - 1]) ;
                    ret.push(p) ;
                    arr.push(this.downloadFile(url, p));
                }
            }

            Promise.all(arr).then(() => {
                resolve(ret);
            }).catch(err => {
                reject(err);
            }) ;            
        }) ;
    }
}
