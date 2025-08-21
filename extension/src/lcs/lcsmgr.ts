import { ModusToolboxEnvironment } from "../mtbenv";
import * as os from 'os';
import * as path from 'path' ;

export class LCSManager {
    static lcsCliUUID: string = '74a9688f-86e2-4ea0-8590-ca29a4b91ca4' ;
    static sentinelString: string = 'No items in watch list' ;
    private env_ : ModusToolboxEnvironment ;
    private needsUpdate_ : boolean = false ;
    private bsps_ : string[] = [] ;

    constructor(env: ModusToolboxEnvironment) {
        this.env_ = env ;
    }

    public get isValid() : boolean {
        return this.bsps_.length > 0 ;
    }

    public get needsUpdate() : boolean {
        return this.needsUpdate_ ;
    }

    public init() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.getLcsBSPS().then((bsps) => {
                this.bsps_ = bsps;
                this.getNeedsUpdate().then((needsUpdate) => {
                    if (needsUpdate) {
                    }
                    resolve();
                }).catch((error) => {
                    reject(error);
                });
            }).catch((error) => {
                reject(error);
            });
        });
        return ret;
    }

    private getNeedsUpdate() : Promise<boolean> {
        let ret = new Promise<boolean>((resolve, reject) => {
            let cmd = this.findLcsCLI() ;
            if (!cmd) {
                reject(new Error("lcs-cli command not found")) ;
                return ;
            }
            let args : string[] = ['--check-for-updates'] ;
            ModusToolboxEnvironment.runCmdCaptureOutput(os.homedir(), cmd, this.env_.toolsDir, args)
                .then((output) => {
                })
                .catch((error) => {
                    reject(error);
                });
        });
        return ret;
    }

    private getLcsBSPS() : Promise<string[]> {
        let ret = new Promise<string[]>((resolve, reject) => {
            let cmd = this.findLcsCLI() ;
            if (!cmd) {
                reject(new Error("lcs-cli command not found")) ;
                return ;
            }
            let args : string[] = ['--list-bsps'] ;
            ModusToolboxEnvironment.runCmdCaptureOutput(os.homedir(), cmd, this.env_.toolsDir, args)
                .then((output) => {
                    if (output[0] !== 0) {
                        reject(new Error("lcs-cli command failed")) ;
                        return ;
                    }
                    let bsps = this.parseOutput(output[1]) ;
                    resolve(bsps);
                })
                .catch((error) => {
                    reject(error);
                });            
        }) ;
        return ret ;
    }

    private findLcsCLI() : string | undefined {
        let ret : string | undefined ;

        let tool = this.env_.toolsDB.findToolByGUID(LCSManager.lcsCliUUID);
        if (tool) {
            ret = path.join(tool.path, 'lcs-manager-cli') ;
        }
        return ret ;
    }

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