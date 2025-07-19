
import { ApplicationType, MTBAppInfo } from "./mtbappinfo";
import * as path from 'path' ;
import * as fs from 'fs' ;
import { MTBUtils } from "../misc/mtbutils";
import { MTBNames } from "../misc/mtbnames";
import { MTBProjectInfo } from "./mtbprojinfo";
import winston from "winston";

export class MTBAppLoader {
    private app_ : MTBAppInfo ;
    private toolsdir_ : string ;
    private modus_shell_dir_? : string ;
    private logger_ : winston.Logger ;

    constructor(logger: winston.Logger, app: MTBAppInfo, toolsdir: string) {
        this.app_ = app ;
        this.toolsdir_ = toolsdir ;
        this.logger_ = logger ;
    }

    public load() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (!this.toolsdir_) {
                let msg = `loadapp: cannot load application - no tools directory located` ;
                this.logger_.error(msg) ;
                reject(new Error(msg)) ;
            }
            else {
                if (!this.setupModusShell()) {
                    let msg = `loadapp: cannot find 'modus-shell' in the tools directory '${this.toolsdir_}'` ;
                    this.logger_.error(msg) ;
                    reject(new Error(msg)) ;
                } else {
                    let mfile = this.findMakeFile() ;
                    if (mfile === undefined) {
                        let msg = `loadapp: cannot find makefile at the top of the application directory '${this.app_.appdir}' ` ;
                        this.logger_.error(msg) ;
                        reject(new Error(msg)) ;
                    }
                    else {
                        MTBUtils.callGetAppInfo(this.modus_shell_dir_!, this.app_.appdir)
                            .then((vars) => {
                                this.app_.setVars(vars) ;
                                let err = this.app_.isValid() ;
                                if (err) {
                                    reject(err) ;
                                }

                                let type = vars.get(MTBNames.MTB_TYPE) ;
                                if (type === MTBNames.MTB_TYPE_APPLICATION) {
                                    this.loadApplication(vars)
                                        .then(() => {
                                            resolve() ;
                                        })
                                        .catch((err) => {
                                            reject(err) ;
                                        })
                                }
                                else if (type === MTBNames.MTB_TYPE_COMBINED) {
                                    this.loadCombined(vars)
                                        .then(() => {
                                            resolve() ;
                                        })
                                        .catch((err) => {
                                            reject(err) ;
                                        })
                                }
                                else if (type === MTBNames.MTB_TYPE_PROJECT) {
                                    let msg = `loadapp: the makefile in directory '${this.app_.appdir}' returned a type of 'PROJECT' which is not valid in the top level directory` ;
                                    this.logger_.error(msg) ;
                                    reject(new Error(msg)) ;
                                }
                                else {
                                    let msg = `loadapp: the makefile in directory '${this.app_.appdir}' returns a type of ${type} which is not a valid value` ;
                                    this.logger_.error(msg) ;
                                    reject(new Error(msg)) ;
                                }
                            })
                            .catch((err) => {
                                reject(err) ;
                            }) ;
                    }
                }
            }
        }) ;
        return ret;
    }

    private setupModusShell() : boolean {
        let ret = true ;

        if (!this.modus_shell_dir_) {
            this.modus_shell_dir_ = path.join(this.toolsdir_, 'modus-shell') ;
            if (!fs.existsSync(this.modus_shell_dir_) || !fs.statSync(this.modus_shell_dir_).isDirectory()) {
                this.modus_shell_dir_ = undefined ;
                ret = false ;
            }
        }

        return ret;
    }

    private loadCombined(vars: Map<string, string>) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.app_.setType(ApplicationType.Combined) ;
            let projinfo = new MTBProjectInfo(this.app_, this.app_.appdir, vars) ;
            this.processProject(projinfo)
                .then(() => {
                    this.app_.addProject(projinfo) ;
                    resolve() ;
                })
                .catch((err) => {
                    reject(err) ;
                })
        }) ;
        return ret ;
    }

    private loadProject(projdir: string) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (!this.setupModusShell()) {
                let msg = `loadapp: cannot find 'modus-shell' in the tools directory '${this.toolsdir_}'` ;
                this.logger_.error(msg) ;
                reject(new Error(msg)) ;                
            }

            MTBUtils.callGetAppInfo(this.modus_shell_dir_!, projdir)
                .then((vars) => {
                    let projinfo = new MTBProjectInfo(this.app_, projdir, vars) ;
                    this.processProject(projinfo)
                        .then(()=> {
                            this.app_.addProject(projinfo) ;
                            resolve() ;
                        })
                        .catch((err) => {
                            reject(err) ;
                        })
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
        }) ;
        return ret;
    }

    private loadApplication(vars: Map<string, string>) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (!vars.has(MTBNames.MTB_PROJECTS)) {
                let msg = `directory ${this.app_.appdir} was of type 'APPLICATION' but did not return an MTB_PROJECTS value` ;
                this.logger_.error(msg) ;
                reject(new Error(msg)) ;
            }
            else {
                this.app_.setType(ApplicationType.Application) ;
                let pall = [] ;
                for(let proj of vars.get(MTBNames.MTB_PROJECTS)!.split(' ')) {
                    let projpath = path.join(this.app_.appdir, proj) ;
                    let p = this.loadProject(projpath) ;
                    pall.push(p) ;
                }

                Promise.all(pall)
                    .then(() => {
                        resolve() ;
                    })
                    .catch((err) => {
                        reject(err) ;
                    }) ;
            }
        }) ;
        return ret ;
    }    

    private processProject(projinfo: MTBProjectInfo) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let err = projinfo.isValid() ;
            if (err) {
                reject(err) ;
            }

            projinfo.initialize(this.logger_)
                .then(() => {
                    resolve() ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
            
            resolve() ;
        }) ;

        return ret;
    }

    private findMakeFile() : string | undefined {
        let appdir = this.app_.appdir ;
        let mfile = path.join(appdir, 'Makefile') ;
        if (fs.existsSync(mfile)) {
            return mfile ;
        }

        mfile = path.join(appdir, 'makefile') ;
        if (fs.existsSync(mfile)) {
            return mfile ;
        }

        return undefined ;
    }
}
