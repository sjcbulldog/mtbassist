import { MTBAssistObject } from "../extobj/mtbassistobj";
import { MtbManagerBase } from "../mgrbase/mgrbase";
import { IDCLauncher } from "./launcher";
import fetch, { Response } from 'node-fetch';
import { ToolList } from "./toollist";
import { MTBVersion } from "../mtbenv/misc/mtbversion";
import { IDCRegistry } from "./idcreg";
import { SetupProgram } from "../comms";
import * as path from 'path' ;
import * as fs from 'fs' ;

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

export class SetupMgr extends MtbManagerBase {
    private static readonly mtbFeatureId = 'com.ifx.tb.tool.modustoolbox';
    private static readonly mtbSetupId = 'com.ifx.tb.tool.modustoolboxsetup';
    private static readonly downloadRatio = 0.8;

    private static readonly requiredFeatures : string[] = [
        'com.ifx.tb.tool.modustoolboxedgeprotectsecuritysuite',
        'com.ifx.tb.tool.modustoolboxprogtools',
        'com.ifx.tb.tool.modustoolbox',
        'com.ifx.tb.tool.mtbgccpackage',
        'com.ifx.tb.tool.modustoolboxsetup',

    ] ;

    private static readonly optionalFeatures : string[] = [
        'com.ifx.tb.tool.modustoolboxpackmachinelearning',
        'com.ifx.tb.tool.modustoolboxpackmultisense',
        'com.ifx.tb.tool.ifxmotorsolutions',
        'com.ifx.tb.tool.modustoolboxpacksmartinductioncooktop'
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
        return this.neededTools_.length === 1 && this.neededTools_[0].featureId === SetupMgr.mtbFeatureId ;
    }

    public set mtbLocation(loc: string | undefined) {
        this.mtbLocation_ = loc ;
    }

    public set mtbTools(loc: string | undefined) {
        this.mtbTools_ = loc ;
    }

    public get mtbLocations() : string[] {
        let ret : string[] = [] ;

        let tools = this.registry_.getToolsByFeatureId(SetupMgr.mtbFeatureId) ;
        if (tools.length > 0) {
            for (let tool of tools) {
                if (tool.path && fs.existsSync(tool.path)) {
                    let p = path.normalize(tool.path) ;
                    let toolsDir = this.findToolsDirFromPath(p);
                    if (toolsDir) {
                        ret.push(toolsDir);
                    }
                }
            }
        }

        ret.sort(this.compareToolsDirs.bind(this)) ;
        return ret ;
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
            if (!this.registry_.hasTool(f)) {
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
                                resolve(true) ;
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

            this.downloadTools(tools)
            .then(() => {
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

            if (this.registry_.hasTool(f)) {
                //
                // We have this required tool, see if there is a newer version
                //
                let latest = this.findLatestVersion(pgm);
                let inst = this.registry_.getLatestToolByFeatureId(f) ;
                if (latest && latest.isGreaterThen(MTBVersion.fromVersionString(inst!.version))) {
                    ret.push({
                        featureId: f,
                        name: this.getName(f),
                        version: latest.toString(),
                        required: required,
                        upgradable: true,
                        installed: true,
                        current: inst!.version,
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
                        current: inst!.version,
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

    private downloadTools(tools: SetupProgram[]) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let promises = [];
            for(let f of tools.map(t => t.featureId)) {
                let p = this.downloadFeature(f);
                promises.push(p);
            }

            Promise.all(promises)
            .then(() => {
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

    private installFeature(id: string, version: string) : Promise<void> {
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

    private downloadFeature(id: string)  : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.emit('downloadProgress', id, 'Preparing...', 0);   
            let tool = this.toollist_.getToolByFeature(id);
            let version = this.findLatestVersion(tool) ;
            if (!version) {
                this.logger.error(`For feature ${id} no versions were detected}`);
                resolve() ;
            }
            else {
                if (!this.accessToken_) {
                    this.logger.error('No access token available for downloading feature');
                    resolve() ;
                }
                else {
                    let cmdstr = 'downloadOnly ' + id + ':' + version.toString() + ' https://softwaretools.infineon.com/api/v1/tools/';
                    this.launcher_.run(['-accesstoken', this.accessToken_!.accessToken, '-idc.service', cmdstr], this.downloadCallback.bind(this), id)
                    .then((result) => {
                        if (!result) {
                            //
                            // Report the error - then resolve
                            //
                            this.logger.error(`Failed to download feature ${id} - ${version}`);
                            this.emit('downloadProgress', id, 'Download Error', 100);   
                            resolve();
                        }
                        else {
                            this.logger.debug(`Feature ${id} version ${version} downloaded successfully.`);
                            this.logger.debug(`Installing feature ${id} version ${version}...`);
                            this.emit('downloadProgress', id, 'Installing...', SetupMgr.downloadRatio * 100 );
                            this.installFeature(id, version!.toString())
                            .then(() => {
                                this.emit('downloadProgress', id, 'Complete', 100) ;
                                this.logger.debug(`Feature ${id} version ${version} installed successfully.`);
                                resolve();
                            })
                            .catch((err) => {
                                this.logger.error(`Error installing feature ${id} version ${version}:`, err);
                                reject(err);
                            });
                        }
                    })
                    .catch((err) => {
                        reject(err);
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
}
