import { MTBAssistObject } from "../extobj/mtbassistobj";
import { MtbManagerBase } from "../mgrbase/mgrbase";
import { IDCLauncher } from "./launcher";
import fetch, { Response } from 'node-fetch';

export interface AccessTokenResponse {
    accessToken: string;
    expires_in: string ;
    received_at: string ;
    response: string;
}

export class SetupMgr extends MtbManagerBase {
    private launcher_ : IDCLauncher ;
    private port_? : number ;
    private accessToken_?: AccessTokenResponse;

    constructor(ext: MTBAssistObject) {
        super(ext);
        this.launcher_ = new IDCLauncher(this.logger);
    }

    public async initialize() : Promise<boolean> {
        let ret = new Promise<boolean>((resolve, reject) => {
            this.launcher_.start()
            .then((result) => {
                if (result === undefined) {
                    resolve(false) ;
                    return ;
                }

                this.getServicePort()
                .then((port) => {
                    if (!port) {
                        resolve(false);
                        return;
                    }

                    this.port_ = port;
                    this.getAccessToken()
                    .then((result) => {
                        if (!result) {
                            reject(new Error('Failed to retrieve access token'));
                            return;
                        }

                        this.accessToken_ = result as AccessTokenResponse;
                        resolve(true);
                    })
                    .catch((err) => {
                        reject(err) ;
                    }) ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
            })
        });

        return ret ;
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
