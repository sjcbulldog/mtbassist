import { MTBAssistObject } from "../extobj/mtbassistobj";
import { MtbManagerBase } from "../mgrbase/mgrbase";
import { IDCLauncher } from "./launcher";
import fetch, { Response } from 'node-fetch';
import { ToolList } from "./toollist";
import { MTBVersion } from "../mtbenv/misc/mtbversion";
import { IDCRegistry } from "./idcreg";
import { SetupProgram } from "../comms";

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
    private static readonly requiredFeatures : string[] = [
        'com.ifx.tb.tool.modustoolboxedgeprotectsecuritysuite',
        'com.ifx.tb.tool.modustoolboxprogtools',
        'com.ifx.tb.tool.modustoolbox',
        'com.ifx.tb.tool.mtbgccpackage'
    ] ;

    private static readonly optionalFeatures : string[] = [
        'com.ifx.tb.tool.modustoolboxpackmachinelearning',
        'com.ifx.tb.tool.modustoolboxpackmultisense',
        'com.ifx.tb.tool.ifxmotorsolutions',
        'com.ifx.tb.tool.modustoolboxpacksmartinductioncooktop'
    ] ;

    private launcher_ : IDCLauncher ;
    private toollist_ : ToolList ;
    private registry_ : IDCRegistry ;
    private port_? : number ;
    private accessToken_?: AccessTokenResponse;
    private neededTools_ : SetupProgram[] = [] ;

    constructor(ext: MTBAssistObject) {
        super(ext);
        this.launcher_ = new IDCLauncher(this.logger);
        this.toollist_ = new ToolList(this.logger) ;
        this.registry_ = new IDCRegistry(this.logger);
    }

    public get neededTools() : SetupProgram[] {
        return this.neededTools_ ;
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
        return [...this.checkNeededTools(SetupMgr.requiredFeatures, true), ...this.checkNeededTools(SetupMgr.optionalFeatures, false)] ;
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
                let inst = this.registry_.getToolByFeatureId(f) ;
                if (latest && latest.isGreaterThen(MTBVersion.fromVersionString(inst!.version))) {
                    ret.push({
                        featureId: f,
                        name: pgm.name,
                        version: latest.toString(),
                        required: required,
                        upgradable: true,
                        installed: true,
                    });
                }
                else {
                    ret.push({
                        featureId: f,
                        name: pgm.name,
                        version: '',
                        required: required,
                        upgradable: false,
                        installed: true,
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
                            name: pgm.name,
                            version: latest.toString(),
                            required: required,
                            upgradable: false,
                            installed: false
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

    private downloadTools() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let promises = [];
            for(let f of SetupMgr.requiredFeatures) {
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
        console.log(`Download callback ${id || '???'}: ${lines.join('\n')}`);
    }

    private downloadFeature(id: string)  : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
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
                            reject(new Error('Failed to download feature'));
                            return;
                        }
                        resolve();
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
                            console.log('access: ' + json.accessToken) ;
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
