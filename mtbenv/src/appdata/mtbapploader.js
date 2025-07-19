"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTBAppLoader = void 0;
const mtbappinfo_1 = require("./mtbappinfo");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const mtbutils_1 = require("../misc/mtbutils");
const mtbnames_1 = require("../misc/mtbnames");
const mtbprojinfo_1 = require("./mtbprojinfo");
class MTBAppLoader {
    app_;
    toolsdir_;
    modus_shell_dir_;
    logger_;
    constructor(logger, app, toolsdir) {
        this.app_ = app;
        this.toolsdir_ = toolsdir;
        this.logger_ = logger;
    }
    load() {
        let ret = new Promise((resolve, reject) => {
            if (!this.toolsdir_) {
                let msg = `loadapp: cannot load application - no tools directory located`;
                this.logger_.error(msg);
                reject(new Error(msg));
            }
            else {
                if (!this.setupModusShell()) {
                    let msg = `loadapp: cannot find 'modus-shell' in the tools directory '${this.toolsdir_}'`;
                    this.logger_.error(msg);
                    reject(new Error(msg));
                }
                else {
                    let mfile = this.findMakeFile();
                    if (mfile === undefined) {
                        let msg = `loadapp: cannot find makefile at the top of the application directory '${this.app_.appdir}' `;
                        this.logger_.error(msg);
                        reject(new Error(msg));
                    }
                    else {
                        mtbutils_1.MTBUtils.callGetAppInfo(this.modus_shell_dir_, this.app_.appdir)
                            .then((vars) => {
                            this.app_.setVars(vars);
                            let err = this.app_.isValid();
                            if (err) {
                                reject(err);
                            }
                            let type = vars.get(mtbnames_1.MTBNames.MTB_TYPE);
                            if (type === mtbnames_1.MTBNames.MTB_TYPE_APPLICATION) {
                                this.loadApplication(vars)
                                    .then(() => {
                                    resolve();
                                })
                                    .catch((err) => {
                                    reject(err);
                                });
                            }
                            else if (type === mtbnames_1.MTBNames.MTB_TYPE_COMBINED) {
                                this.loadCombined(vars)
                                    .then(() => {
                                    resolve();
                                })
                                    .catch((err) => {
                                    reject(err);
                                });
                            }
                            else if (type === mtbnames_1.MTBNames.MTB_TYPE_PROJECT) {
                                let msg = `loadapp: the makefile in directory '${this.app_.appdir}' returned a type of 'PROJECT' which is not valid in the top level directory`;
                                this.logger_.error(msg);
                                reject(new Error(msg));
                            }
                            else {
                                let msg = `loadapp: the makefile in directory '${this.app_.appdir}' returns a type of ${type} which is not a valid value`;
                                this.logger_.error(msg);
                                reject(new Error(msg));
                            }
                        })
                            .catch((err) => {
                            reject(err);
                        });
                    }
                }
            }
        });
        return ret;
    }
    setupModusShell() {
        let ret = true;
        if (!this.modus_shell_dir_) {
            this.modus_shell_dir_ = path.join(this.toolsdir_, 'modus-shell');
            if (!fs.existsSync(this.modus_shell_dir_) || !fs.statSync(this.modus_shell_dir_).isDirectory()) {
                this.modus_shell_dir_ = undefined;
                ret = false;
            }
        }
        return ret;
    }
    loadCombined(vars) {
        let ret = new Promise((resolve, reject) => {
            this.app_.setType(mtbappinfo_1.ApplicationType.Combined);
            let projinfo = new mtbprojinfo_1.MTBProjectInfo(this.app_, this.app_.appdir, vars);
            this.processProject(projinfo)
                .then(() => {
                this.app_.addProject(projinfo);
                resolve();
            })
                .catch((err) => {
                reject(err);
            });
        });
        return ret;
    }
    loadProject(projdir) {
        let ret = new Promise((resolve, reject) => {
            if (!this.setupModusShell()) {
                let msg = `loadapp: cannot find 'modus-shell' in the tools directory '${this.toolsdir_}'`;
                this.logger_.error(msg);
                reject(new Error(msg));
            }
            mtbutils_1.MTBUtils.callGetAppInfo(this.modus_shell_dir_, projdir)
                .then((vars) => {
                let projinfo = new mtbprojinfo_1.MTBProjectInfo(this.app_, projdir, vars);
                this.processProject(projinfo)
                    .then(() => {
                    this.app_.addProject(projinfo);
                    resolve();
                })
                    .catch((err) => {
                    reject(err);
                });
            })
                .catch((err) => {
                reject(err);
            });
        });
        return ret;
    }
    loadApplication(vars) {
        let ret = new Promise((resolve, reject) => {
            if (!vars.has(mtbnames_1.MTBNames.MTB_PROJECTS)) {
                let msg = `directory ${this.app_.appdir} was of type 'APPLICATION' but did not return an MTB_PROJECTS value`;
                this.logger_.error(msg);
                reject(new Error(msg));
            }
            else {
                this.app_.setType(mtbappinfo_1.ApplicationType.Application);
                let pall = [];
                for (let proj of vars.get(mtbnames_1.MTBNames.MTB_PROJECTS).split(' ')) {
                    let projpath = path.join(this.app_.appdir, proj);
                    let p = this.loadProject(projpath);
                    pall.push(p);
                }
                Promise.all(pall)
                    .then(() => {
                    resolve();
                })
                    .catch((err) => {
                    reject(err);
                });
            }
        });
        return ret;
    }
    processProject(projinfo) {
        let ret = new Promise((resolve, reject) => {
            let err = projinfo.isValid();
            if (err) {
                reject(err);
            }
            projinfo.initialize(this.logger_)
                .then(() => {
                resolve();
            })
                .catch((err) => {
                reject(err);
            });
            resolve();
        });
        return ret;
    }
    findMakeFile() {
        let appdir = this.app_.appdir;
        let mfile = path.join(appdir, 'Makefile');
        if (fs.existsSync(mfile)) {
            return mfile;
        }
        mfile = path.join(appdir, 'makefile');
        if (fs.existsSync(mfile)) {
            return mfile;
        }
        return undefined;
    }
}
exports.MTBAppLoader = MTBAppLoader;
//# sourceMappingURL=mtbapploader.js.map