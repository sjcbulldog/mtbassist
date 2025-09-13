/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 ret* you may not use this file except in compliance with the License.
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

import { MTBAssistObject } from "../extobj/mtbassistobj";
import { MtbManagerBase } from "../mgrbase/mgrbase";
import { IDCLauncher } from "./launcher";
import fetch, { Response } from 'node-fetch';
import { ToolList } from "./toollist";
import { MTBVersion } from "../mtbenv/misc/mtbversion";
import { IDCRegistry } from "./idcreg";
import { SetupProgram } from "../comms";
import { ModusToolboxEnvironment } from "../mtbenv";
import { MTBRunCommandOptions } from "../mtbenv/mtbenv/mtbenv";
import { InstalledFeature } from "./installedfeature";
import * as path from 'path' ;
import * as fs from 'fs' ;
import * as os from 'os' ;

//
// AppData/Local/Infineon_Technologies_AG/Infineon-Toolbox/Tools/ ...
//
// launcher 
// 

export interface AccessTokenResponse {
    accessToken: string;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    expires_in: string;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    received_at: string;
    response: string;
}

export interface DownloadInstallStatus {
    success: boolean;
    error: string | undefined;
}

export class SetupMgr extends MtbManagerBase {
    private static readonly mtbFeatureId = 'com.ifx.tb.tool.modustoolbox';
    private static readonly mtbSetupId = 'com.ifx.tb.tool.modustoolboxsetup';
    private static readonly downloadRatio = 0.8;
    private static readonly localIDCServiceRequestTimeout = 30000; // 30 seconds

    private static readonly requiredFeatures : string[] = [
        'com.ifx.tb.tool.modustoolboxedgeprotectsecuritysuite',
        'com.ifx.tb.tool.modustoolboxprogtools',
        'com.ifx.tb.tool.modustoolbox',
        'com.ifx.tb.tool.mtbgccpackage',
        'com.ifx.tb.tool.modustoolboxsetup',

    ] ;

    private static readonly progressRegEx = /(\d+(?:\.\d+)?)% completed/;

    private launcher_ : IDCLauncher ;
    private toollist_ : ToolList ;
    private registry_ : IDCRegistry ;
    private port_? : number ;
    private accessToken_?: AccessTokenResponse;
    private neededTools_ : SetupProgram[] = [] ;
    private mtbLocation_ : string | undefined = undefined ;
    private mtbTools_ : string | undefined = undefined ;
    private installed_ : Map<string, InstalledFeature[]> = new Map<string, InstalledFeature[]>() ;

    constructor(ext: MTBAssistObject) {
        super(ext);
        this.launcher_ = new IDCLauncher(this.logger);
        this.toollist_ = new ToolList(this.logger) ;
        this.registry_ = new IDCRegistry(this.logger);
    }

    public get isLauncherAvailable() : boolean {
        return this.launcher_.found ;
    }

    public get neededTools() : SetupProgram[] {
        return this.neededTools_ ;
    }

    public get justNeedToolsPackage() : boolean {
        if (!this.doWeNeedTools()) {
            return false;
        }

        let count = 0 ;
        let fid: string = '' ;
        for(let f of SetupMgr.requiredFeatures) {
            if (!this.registry_.hasTool(f)) {
                count++ ;
                fid = f ;
            }
        }
        return count === 1 && fid === SetupMgr.mtbFeatureId;
    }

    public set mtbLocation(loc: string | undefined) {
        this.mtbLocation_ = loc ;
    }

    public set mtbTools(loc: string | undefined) {
        this.mtbTools_ = loc ;
    }

    public toolsFromIDCRegistry() : string[] {
        let tlist = this.registry_.getToolsByFeatureId('com.ifx.tb.tool.modustoolbox') ;
        let dirlist = tlist.map(tool => tool.path!).filter(p => p !== undefined) ;

        let final : string[] = [] ;
        for(let d of dirlist) {
            let p = this.trimPath(d) ;
            if (p && fs.existsSync(p)) {
                final.push(p) ;
            }
        }

        return final ;
    }

    private trimPath(p: string) : string | undefined {
        while (true) {
            let base = path.basename(p) ;
            if (/^tools_[0-9]+.[0-9]+$/.test(base)) {
                return p ;
            }

            p = path.dirname(p) ;
            if (p === '/' || /^[A-Za-z]:[\\\/]$/.test(p)) {
                break ;
            }            
        }

        return undefined ;
    }

    private getMTBDirectoryVersion(p : string) : MTBVersion | undefined {
        let bname = path.basename(p) ;
        let m = /^(tools_[0-9]+\.[0-9]+)$/.exec(bname) ;
        if (m) {
            return MTBVersion.fromToolsVersionString(m[1]) ;
        }
        return undefined ;
    }

    public get mtbInstallDirs() : string[] {
        let ret: string[] = [] ;
        let p = path.join(this.ext.context.globalStorageUri.fsPath, 'installpaths.json') ;
        if (fs.existsSync(p)) {
            try {
                let content = fs.readFileSync(p, { encoding: 'utf8' }) ;
                ret = JSON.parse(content) as string[] ;
            } catch {
                // Ignore errors
            }
        }   

        return ret ;
    }

    private remeberInstallPath() : void {
        let p = this.ext.context.globalStorageUri.fsPath ;
        if (!fs.existsSync(p)) {
            fs.mkdirSync(p) ;
            if (!fs.existsSync(p)) {
                return ;
            }
        }

        let instlist : string[] = [] ;
        let f = path.join(p, 'installpaths.json') ;
        if (fs.existsSync(f)) {
            try {
                let content = fs.readFileSync(f, { encoding: 'utf8' }) ;
                instlist = JSON.parse(content) as string[] ;
            } catch {
                // Ignore errors
            }
        }

        if (this.mtbLocation_) {
            instlist.push(this.mtbLocation_!) ;
            instlist = [...new Set(instlist)] ;

            // Filter out any where the directory does not exist
            let final : string[] = [] ;
            for(let d of instlist) {
                if (fs.existsSync(d)) {
                    final.push(d) ;
                }
            }
            
            instlist.sort(this.compareToolsDirs.bind(this)) ;
            try {
                fs.writeFileSync(f, JSON.stringify(final), { encoding: 'utf8' }) ;
            } catch {
                // Ignore errors
            }
        }                
    }

    private compareToolsDirs(a: string, b: string) : number {
        let basea = path.basename(a) ;
        let baseb = path.basename(b) ;
        return basea.localeCompare(baseb);
    }

    private findToolsDirFromPath(p: string) : string | undefined {
        while (true) {
            let bname = path.basename(p) ;
            if (/^tools_[0-9]+.[0-9]+$/.test(bname)) {
                return p ;
            }
            let parent = path.dirname(p) ;
            if (parent === p) {
                break ;
            }
            p = parent ;
        }

        return undefined ;
    }

    public async initializeLocal() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.registry_.initialize()
            .then(() => {
                this.findInstalledPrograms() ;
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
        });

        return ret;
    }

    public doWeNeedTools() : boolean {
        for(let f of SetupMgr.requiredFeatures) {
            if (!this.installed_.has(f)) {
                this.logger.warn(`Missing required feature: ${f}`);
                return true;
            }
        }
        return false;
    }

    public async initialize() : Promise<boolean> {
        let ret = new Promise<boolean>((resolve, reject) => {
            this.logger.debug('Initializing Setup Manager...');
            this.startIDCService()
            .then((result) => {
                if (!result) {
                    resolve(false) ;
                    return ;
                }

                this.logger.debug('Getting service port...');
                this.getServicePort()
                .then((port) => {
                    if (!port) {
                        this.emit('setupError', 'Could not launch IDC service');
                        resolve(false);
                        return;
                    }

                    this.port_ = port;
                    this.logger.debug(`Service port: ${port}`);
                    this.logger.debug('Getting access token...');
                    this.getAccessToken()
                    .then((result) => {
                        if (!result) {
                            reject(new Error('Failed to retrieve access token'));
                            return;
                        }
                        this.accessToken_ = result as AccessTokenResponse;
                        this.logger.debug(`Access token: ${this.accessToken_.accessToken}`);
                        this.logger.debug('Initializing tool list...');
                        this.toollist_.initialize()
                            .then(() => {
                                this.logger.debug('Tool list initialized successfully.');                                
                                this.neededTools_ = this.findNeededTools();
                                resolve(true);
                            })
                            .catch((err) => {
                                this.logger.error('Error fetching tool manifest:', err);
                                reject(err) ;
                            });
                    })
                    .catch((err) => {
                        reject(err) ;
                    }) ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
            });
        });

        return ret ;
    }

    public findNeededTools() : SetupProgram[] {
        return [...this.checkNeededTools(SetupMgr.requiredFeatures, true)] ;
    }

    public installTools(tools: SetupProgram[]) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (!this.port_) {
                this.logger.error('No service port available for installing tools');
                reject(new Error('No service port available'));
                return;
            }

            if (!this.accessToken_) {
                this.logger.error('No access token available for installing tools');
                reject(new Error('No access token available'));
                return;
            }

            this.downloadAndInstallAllTools(tools)
            .then(() => {
                this.remeberInstallPath() ;
                this.logger.debug('All tools downloaded successfully.');
                resolve();
            })
            .catch((err) => {
                this.logger.error('Error downloading tools:', err);
                reject(err);
            });
        });

        return ret ;
    }

    private isModusToolbox(id: string) {
        return id === 'com.ifx.tb.tool.modustoolbox' ;
    }

    private getName(id: string) : string {
        let ret : string ;
        
        if (id === SetupMgr.mtbSetupId) {
            ret = 'ModusToolbox Setup';
        } else {
            ret = this.toollist_.getToolByFeature(id)?.name || 'Unknown';
        }
        return ret;
    }

    private checkNeededTools(flist: string[], required: boolean) : SetupProgram[] {
        let ret : SetupProgram[] = [] ;
        for(let f of flist) {
            let pgm = this.toollist_.getToolByFeature(f);
            if (pgm === undefined) {
                this.logger.error(`No IDC tool entry found for feature: ${f} which is a ${required ? 'required' : 'optional'} feature`);
                continue ;
            }

            if (this.installed_.has(f)) {
                //
                // We have this required tool, see if there is a newer version
                //
                let latest = this.findLatestVersion(pgm);
                let inst = this.findLatestInstalledVersion(f) ;
                if (inst && latest && latest.isGreaterThen(inst!.version)) {
                    ret.push({
                        featureId: f,
                        name: this.getName(f),
                        version: latest.toString(),
                        required: required,
                        upgradable: true,
                        installed: true,
                        current: inst!.version.toString(),
                        versions: []
                    });
                }
                else {
                    ret.push({
                        featureId: f,
                        name: this.getName(f),
                        version: '',
                        required: required,
                        upgradable: false,
                        installed: true,
                        current: inst!.version.toString(),
                        versions: []                
                    });
                }
            }
            else { 
                if (pgm) {
                    let latest = this.findLatestVersion(pgm);
                    if (!latest) {
                        this.logger.error(`No valid version found for feature: ${f}`);
                    } else {
                        ret.push({
                            featureId: f,
                            name: this.getName(f),
                            version: latest.toString(),
                            required: required,
                            upgradable: false,
                            installed: false,
                            versions: []
                        });
                    }
                }
            }
        }
        return ret ;
    }

    private startIDCService() : Promise<boolean> {
        let ret = new Promise<boolean>((resolve, reject) => {
            this.isServiceRunning()
            .then((isRunning) => {
                if (isRunning) {
                    resolve(true);
                } else {
                    this.launcher_.start()
                    .then(() => {
                        resolve(true);
                    })
                    .catch((err) => {
                        reject(err);
                    });
                }
            })
            .catch((err) => {
                reject(err);
            });
        });
        return ret;
    }

    private downloadAndInstallAllTools(tools: SetupProgram[]) : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            let passwd : string | undefined = undefined ;
            if (this.mtbLocation_?.startsWith('/Applications')) {
                passwd = await this.ext.getPasswordFromUser() ;
                if (passwd === undefined) {
                    reject(new Error('Password is required for installation to /Applications'));
                }
            }

            if (!passwd && this.mtbLocation_?.startsWith('/Applications')) {
                reject(new Error('Password is required for installation to /Applications'));
                return ;
            }

            let promises = [];
            for(let f of tools.map(t => t.featureId)) {
                let p = this.downloadAndInstallFeature(f, passwd);
                promises.push(p);
            }

            Promise.all(promises)
            .then((status: DownloadInstallStatus[]) => {
                let msg = '' ;
                for(let s of status) {
                    if (!s.success) {
                        if (msg.length > 0) {
                            msg += '<br><br>' ;
                        }
                        msg += s.error ;
                    }
                }
                if (msg.length > 0) {
                    reject(new Error('Some required tools did not install correctly<br><br>' + msg)) ;
                    return ;
                }
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
        });

        return ret;
    }

    private findLatestVersion(tool: any) : MTBVersion | undefined {
        let latest : MTBVersion | undefined = undefined;
        for(let v of Object.keys(tool.versions)) {
            let vobj = MTBVersion.fromVersionString(v) ;
            if (!latest || (vobj && vobj.isGreaterThen(latest))) {
                latest = vobj;
            }
        }

        return latest ;
    }

    private downloadCallback(lines: string[], id?: any) {
        for(let line of lines) {
            let m = SetupMgr.progressRegEx.exec(line);
            if (m) {
                let percent = parseFloat(m[1]);
                this.logger.debug(`Download progress for ${id}: ${percent}%`);
                this.emit('downloadProgress', id, `Downloading ... ${percent}%`, percent * SetupMgr.downloadRatio);
            }
        }
    }

    private getOSKey() : string {
        let ret = 'win32' ;

        if (process.platform === 'win32') {
            ret = 'windows';
        } else if (process.platform === 'darwin') {
            ret = 'macOS';
        } else {
            ret = 'linux';
        }
        return ret;
    }

    private findAttributes(props: SetupProgram, version: string) {
        let one: any = undefined ;
        let key: string = this.getOSKey() ;
        if (props.versions) {
            for(let v of Object.keys(props.versions)) {
                if (v === version) {
                    let obj = props.versions[v as keyof typeof props.versions] ;
                    let attrs = obj.additionalAttributes ;
                    if (attrs && attrs[key]) {
                        one = attrs[key] ;
                    }
                }
            }
        }
        return one ;
    }

    private idToName(id: string) {
        let tags = id.split('.') ;
        return tags[tags.length - 1] ;
    }

    private installFeature(id: string, version: string, password?: string) : Promise<void> {
        let p: Promise<void> ;

        if (process.platform === 'darwin') {
            p = this.installFeatureDarwin(id, version, password) ;
        }
        else if (process.platform === 'win32') {
            p = this.installFeatureWin32(id, version) ;
        }
        else if (process.platform === 'linux') {
            p = this.installFeatureLinux(id, version) ;
        }
        else {
            throw Error('Unsupported platform');
        }

        return p;
    }

    private findUrl(v: any) : string | undefined {
        let os : string ;

        if (process.platform === 'darwin') {
            os = 'macos';
        } else if (process.platform === 'win32') {
            os = 'windows';
        } else {
            os = 'linux';
        }

        let p : string | undefined = undefined ;

        if (!v.downloadUrls) {
            return undefined;
        }

        for(let one of v.downloadUrls) {
            let tos: string = one.os as string ;
            if (tos.toLowerCase() === os) {
                p = one.url ;
                break ;
            }
        }

        if (!p) {
            return undefined ;
        }

        if (!p.endsWith('/download')) {
            return undefined ;
        }

        return path.basename(path.dirname(p)) ;
    }

    private findInstallerPath(props: SetupProgram, version: string) : string | undefined {
        if (!props.versions) {
            return undefined ;
        }
        let v = props.versions[version as keyof typeof props.versions] ;
        if (!v) {
            return v ;
        }

        let p = this.findUrl(v) ;
        if (!p) {
            return undefined ;
        }

        return path.join(os.homedir(), 'Library', 'Application Support', 'Infineon_Technologies_AG', 'Infineon-Toolbox', 'Tools', p) ;
    }

    private installFeatureDarwin(id: string, version: string, password?: string) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let props = this.toollist_.getToolByFeature(id) ;
            if (!props) {
                this.logger.error(`No tool found for feature ${id}`);
                resolve() ;
                return ;
            }

            let p = this.findInstallerPath(props, version);
            if (!p) {
                reject("cannot find installer executable") ;
                return ;
            }

            let cmd ;
            let sudopwd: string[] | undefined ;
            let args: string[] ;

            if (this.mtbLocation_?.startsWith('/Applications')) {
                args = ['-S', '/usr/sbin/installer', '-target', '/Applications', '-pkg', p] ;                
                sudopwd = [ password! ] ;
                cmd = '/usr/bin/sudo' ;
            }
            else {
                args = ['-target', 'CurrentUserHomeDirectory', '-pkg', p] ;
                sudopwd = undefined ;
                cmd = '/usr/sbin/installer' ;
            }

            let opts: MTBRunCommandOptions = {
                stdout: sudopwd,
            };
            ModusToolboxEnvironment.runCmdCaptureOutput(cmd, args, opts)
            .then((result) => {
                if (!result || this.wasSucessful(result[1]) === false) {
                    if (result && this.isPasswordError(result[1])) {
                        reject(new Error('Installation failed due to incorrect password')) ;
                    }
                    else {
                        reject(new Error(`Failed to install feature ${id} - ${version}`));
                    }
                    this.emit('downloadProgress', id, 'Installation Error', 100);                       
                    return;
                }
                resolve();
            })
            .catch((err) => {
                reject(new Error(`Failed to install feature ${id} - ${version} - ${err.message}`));
            });
        });
        return ret;
    }

    private isPasswordError(text: string[]) : boolean { 
        for(let line of text) {
            if (line.includes('Sorry, try again.')) {
                return true ;
            }
        }
        return false ;
    }

    private wasSucessful(text: string[]) : boolean {
        for(let line of text) {
            if (line.includes('was successful')) {
                return true ;
            }
        }
        return false ;
    }

    private installFeatureLinux(id: string, version: string) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            setTimeout(() => { resolve(); }, 2000) ;
        });
        return ret;
    }

    private installFeatureWin32(id: string, version: string) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let props = this.toollist_.getToolByFeature(id) ;
            if (!props) {
                this.logger.error(`No tool found for feature ${id}`);
                resolve() ;
                return ;
            }

            let attrs = this.findAttributes(props, version) ;

            let cmdstr = 'installOnly ' + id + ':' + version.toString() + ' https://softwaretools.infineon.com/api/v1/tools/';
            let addargs : string[] = [] ;
            if (true) {
                addargs.push('--') ;
                addargs.push('/verysilent') ;
                addargs.push('/suppressmsgboxes') ;
                addargs.push('/sp-') ;
                if (this.isModusToolbox(id)) {
                    if (this.mtbLocation_ && this.mtbLocation_.length > 0) {
                        addargs.push(`/dir=${this.mtbLocation_}`) ;
                    }
                }
                else {
                    if (this.mtbTools_ && this.mtbTools_.length > 0) {
                        let p = path.join(this.mtbTools_, this.idToName(id)) ;
                        addargs.push(`/dir=${p}`) ;
                    }
                }
            }
            this.launcher_.run(['-idc.service', cmdstr, ...addargs], this.downloadCallback.bind(this), id)
            .then((result) => {
                if (!result) {
                    reject(new Error(`Failed to install feature ${id} - ${version}`));
                    return;
                }
                resolve();
            })
            .catch((err) => {
                reject(err);
            });  
        }) ;
        return ret;      
    }

    private downloadAndInstallFeature(id: string, password: string | undefined)  : Promise<DownloadInstallStatus> {
        let ret = new Promise<DownloadInstallStatus>((resolve, reject) => {
            this.emit('downloadProgress', id, 'Preparing...', 0);   
            let tool = this.toollist_.getToolByFeature(id);
            let version = this.findLatestVersion(tool) ;
            if (!version) {
                let msg = `For feature ${id} no versions were detected` ;
                this.logger.error(msg);
                resolve({ success: false, error: msg }) ;
            }
            else {
                if (!this.accessToken_) {
                    let msg = 'No access token available for downloading feature' ;
                    this.logger.error(msg);
                    resolve({ success: false, error: msg }) ;
                }
                else {
                    let cmdstr = 'downloadOnly ' + id + ':' + version.toString() + ' https://softwaretools.infineon.com/api/v1/tools/';
                    this.launcher_.run(['-accesstoken', this.accessToken_!.accessToken, '-idc.service', cmdstr], this.downloadCallback.bind(this), id)
                    .then((result) => {
                        if (!result) {
                            //
                            // Report the error - then resolve
                            //
                            let msg = `Failed to download feature ${id} - ${version}` ;
                            this.logger.error(msg);
                            this.emit('downloadProgress', id, 'Download Error', 100);   
                            resolve({ success: false, error: msg }) ;
                        }
                        else {
                            this.logger.debug(`Feature ${id} version ${version} downloaded successfully.`);
                            this.logger.debug(`Installing feature ${id} version ${version}...`);
                            this.emit('downloadProgress', id, 'Installing...', SetupMgr.downloadRatio * 100 );
                            this.installFeature(id, version!.toString(), password)
                            .then(() => {
                                this.emit('downloadProgress', id, 'Complete', 100) ;
                                let msg = `Feature ${id} version ${version} installed successfully.` ;
                                this.logger.debug(msg);
                                resolve({ success: true, error: msg });
                            })
                            .catch((err) => {
                                let msg = `Error installing feature ${id} version ${version} - ${err.message}` ;
                                this.logger.error(msg, err);
                                resolve({ success: false, error: msg });
                            });
                        }
                    })
                    .catch((err) => {
                        let msg = `Error downloading feature ${id} - ${version}` ;
                        this.logger.error(msg, err);
                        resolve({ success: false, error: msg });
                    });
                }
            }
        });
        return ret;
    }

    private isServiceRunning() : Promise<boolean> {
        let ret = new Promise<boolean>((resolve, reject) => {
            this.getServicePort()
            .then((result) => { 
                if (!result || result === -1) {
                    resolve(false) ;
                }
                resolve(true) ;
            })
            .catch((err) => { 
                reject(err) ;
            }) ;
        });

        return ret;
    }

    private getServicePort() : Promise<number | undefined> {
        let ret = new Promise<number | undefined>((resolve, reject) => {
            this.launcher_.run(['--port'])
            .then((result) => {
                if (!result) {
                    resolve(undefined);
                    return;
                }

                const port = parseInt(result.trim(), 10);
                if (isNaN(port)) {
                    resolve(undefined);
                    return;
                }

                resolve(port);
            });
        });

        return ret;
    }

    private getAccessToken() : Promise<AccessTokenResponse | undefined> {
        let page = '/idc-service/requestAccessToken' ;
        let ret = new Promise<AccessTokenResponse | undefined>((resolve, reject) => {
            this.fetchPageFromService(page)
                .then((result) => {
                    if (!result) {
                        resolve(undefined);
                        return;
                    }

                    try {
                        let json = JSON.parse(result);
                        if (json) {
                            resolve(json as AccessTokenResponse);
                        } else {
                            resolve(undefined);
                        }
                    } catch (err) {
                        this.logger.error('Error parsing access token response:', err);
                        resolve(undefined);
                    }
                })
                .catch((err) => {
                    console.error('Error fetching access token:', err);
                    reject(err);
                });
        }) ;
        return ret;
    }

    private fetchPageFromService(page: string) : Promise<string | undefined> {
        let ret = new Promise<string | undefined>((resolve, reject) => {
            let timer = setTimeout(() => { reject(new Error('Timeout waiting for IDC service')); }, SetupMgr.localIDCServiceRequestTimeout) ;
            let uristr = 'http://127.0.0.1:' + this.port_ + page;
            fetch(uristr)
                .then((resp: Response) => {
                    resp.text()
                        .then(text => {
                            resolve(text);
                        })
                        .catch(err => {
                            reject(err);
                        });
                })
                .catch((err) => {
                    reject(err);
                });
        });

        return ret;
    }

    private addTool(tool : InstalledFeature) {
        let arr = this.installed_.get(tool.featureId) ;
        if (!arr) {
            arr = [] ;
            this.installed_.set(tool.featureId, arr) ;
        }
        arr.push(tool);
        arr.sort((a, b) => {
            return MTBVersion.compare(b.version, a.version) ;
        });
    }

    private findLatestInstalledVersion(fid: string) : InstalledFeature | undefined {
        let arr = this.installed_.get(fid) ;
        if (!arr || arr.length === 0) {
            return undefined ;
        }
        return arr[0] ;
    }

    private findInstalledPrograms() {
        // Search via the registry
        for(let fid of SetupMgr.requiredFeatures) {
            let list = this.registry_.getToolsByFeatureId (fid) ;
            for(let entry of list) {
                if (entry) {
                    let ver = MTBVersion.fromVersionString(entry.version) ;
                    let p = entry.path ;
                    if (p && fid === SetupMgr.mtbFeatureId) {
                        p = this.trimPath(p) ;
                    }

                    if (p) {
                        this.addTool(new InstalledFeature(fid, ver, p));
                    }
                }
            }
        }

        // Search standard location
        for(let dir of ModusToolboxEnvironment.findToolsDirectories()) {
            let v = this.getMTBDirectoryVersion(dir) ;
            if (v) {
                this.addTool(new InstalledFeature(SetupMgr.mtbFeatureId, v, dir));
            }
        }

        // Search other directories we know about that were using via the extension installation screen
        for(let instdir of this.mtbInstallDirs) {
            for(let dir of ModusToolboxEnvironment.findToolsDirectories(instdir)) {
                let v = this.getMTBDirectoryVersion(dir) ;
                if (v) {
                    this.addTool(new InstalledFeature(SetupMgr.mtbFeatureId, v, dir));
                }
            }
        }
    }
}
