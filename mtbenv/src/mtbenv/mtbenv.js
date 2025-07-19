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
exports.ModusToolboxEnvironment = void 0;
const loadflags_1 = require("./loadflags");
const mtbmanifestdb_1 = require("../manifest/mtbmanifestdb");
const packdb_1 = require("../packdb/packdb");
const packdbloader_1 = require("../packdb/packdbloader");
const toolsdb_1 = require("../toolsdb/toolsdb");
const mtbutils_1 = require("../misc/mtbutils");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const mtbversion_1 = require("../misc/mtbversion");
const mtbappinfo_1 = require("../appdata/mtbappinfo");
const mtbcmd_1 = require("./mtbcmd");
class ModusToolboxEnvironment {
    // Static variables
    static env_;
    static mtbDefaultManifest = "https://modustoolbox.infineon.com/manifests/mtb-super-manifest/v2.X/mtb-super-manifest-fv2.xml";
    // Instance variables
    isLoading = false;
    appdir_;
    wants_ = loadflags_1.MTBLoadFlags.None;
    has_ = loadflags_1.MTBLoadFlags.None;
    loading_ = loadflags_1.MTBLoadFlags.None;
    manifest_db_;
    tools_db_;
    pack_db_;
    app_info_;
    requested_tools_dir_;
    exe_dir_;
    tools_dir_;
    logger_;
    static getInstance(logger, exedir) {
        if (!ModusToolboxEnvironment.env_) {
            ModusToolboxEnvironment.env_ = new ModusToolboxEnvironment(logger, exedir);
        }
        else {
            if (exedir && exedir !== ModusToolboxEnvironment.env_.exe_dir_) {
                logger.error('ModusToolboxEnvironment already created with a different executable directory');
                logger.error(`    Current: ${ModusToolboxEnvironment.env_.exe_dir_}, New: ${exedir}`);
                return null;
            }
            if (ModusToolboxEnvironment.env_.logger_ !== logger) {
                ModusToolboxEnvironment.env_.logger_ = logger;
            }
        }
        return ModusToolboxEnvironment.env_;
    }
    constructor(logger, exedir) {
        this.logger_ = logger;
        this.tools_db_ = new toolsdb_1.ToolsDB();
        this.pack_db_ = new packdb_1.PackDB();
        this.manifest_db_ = new mtbmanifestdb_1.MTBManifestDB();
        this.exe_dir_ = exedir;
        if (this.exe_dir_) {
            this.exe_dir_ = path.normalize(this.exe_dir_);
        }
        this.logger_ = logger;
    }
    destroy() {
        ModusToolboxEnvironment.env_ = undefined;
    }
    get manifestDB() {
        return this.manifest_db_;
    }
    get toolsDB() {
        return this.tools_db_;
    }
    get packDB() {
        return this.pack_db_;
    }
    get appInfo() {
        return this.app_info_;
    }
    setRequestedToolsDir(dir) {
        this.requested_tools_dir_ = dir;
    }
    toolsDir() {
        return this.tools_dir_;
    }
    load(flags, appdir) {
        let ret = new Promise((resolve, reject) => {
            if (this.isLoading) {
                reject('ModusToolboxEnvironment is already loading');
                return;
            }
            this.isLoading = true;
            this.appdir_ = appdir;
            this.wants_ = flags;
            this.loadPacks()
                .then(() => {
                let plist = [];
                while (true) {
                    let p = this.nextStep();
                    if (p === undefined) {
                        break;
                    }
                    plist.push(p);
                }
                Promise.all(plist)
                    .then(() => {
                    this.isLoading = false;
                    this.wants_ = loadflags_1.MTBLoadFlags.None;
                    resolve();
                })
                    .catch((err) => {
                    this.isLoading = false;
                    this.wants_ = loadflags_1.MTBLoadFlags.None;
                    reject(err);
                });
            })
                .catch((err) => {
                this.logger_.error('Error loading packs: ' + err);
                reject(err);
            });
        });
        return ret;
    }
    checkLoadFlag(flags, mask) {
        return (flags & mask) === mask;
    }
    wants(flags) {
        return this.checkLoadFlag(this.wants_, flags);
    }
    has(flags) {
        return this.checkLoadFlag(this.has_, flags);
    }
    loading(flags) {
        return this.checkLoadFlag(this.loading_, flags);
    }
    executeCommand(cmd) {
        let ret = new Promise((resolve, reject) => {
            this.logger_.debug(`Executing command: ${cmd.exe} ${cmd.args.join(' ')}`);
            // Here you would implement the logic to execute the command
            // For now, we just resolve with 0 to indicate success
            resolve(0);
        });
        return ret;
    }
    executeCommands(cmds) {
        let ret = new Promise((resolve, reject) => {
            let promises = [];
            for (let cmd of cmds) {
                let pro = this.executeCommand(cmd);
                promises.push(pro);
            }
            Promise.all(promises)
                .then((res) => {
                resolve(res);
            })
                .catch((err) => {
                reject(err);
            });
        });
        return ret;
    }
    generateSource(pass) {
        let ret = [];
        for (let tool of this.toolsDB.activeSet) {
            if (!tool.hasCodeGenerator) {
                continue;
            }
            let cmds = this.runCodeGenerator(pass, tool);
            ret.push(...cmds);
        }
        return ret;
    }
    runCodeGenerator(pass, tool) {
        let cmds = [];
        for (let pgm of tool.programs) {
            if (!pgm['code-gen']) {
                continue;
            }
            for (let codegen of pgm['code-gen']) {
                if (codegen.passes.indexOf(pass) >= 0) {
                    let cmd = this.runSpecificCodeGenerator(tool, codegen);
                    cmds.push(cmd);
                }
            }
        }
        return cmds;
    }
    runSpecificCodeGenerator(tool, codegen) {
        let exe = tool.path;
        let argstr = codegen.args;
        let args = argstr.split(' ');
        return new mtbcmd_1.MTBCommand(exe, args);
    }
    nextStep() {
        let ret = undefined;
        if (this.wants(loadflags_1.MTBLoadFlags.AppInfo) && !this.has(loadflags_1.MTBLoadFlags.AppInfo) && !this.loading(loadflags_1.MTBLoadFlags.AppInfo)) {
            if (this.appdir_ === undefined) {
                ret = new Promise((resolve, reject) => {
                    reject('AppInfo was requested via the load flags, but the appdir argument was not provided');
                });
            }
            else {
                this.loading_ |= loadflags_1.MTBLoadFlags.AppInfo;
                ret = this.loadAppInfo();
            }
        }
        else if (this.wants(loadflags_1.MTBLoadFlags.Tools) && !this.has(loadflags_1.MTBLoadFlags.Tools) && !this.loading(loadflags_1.MTBLoadFlags.Tools)) {
            this.loading_ |= loadflags_1.MTBLoadFlags.Tools;
            ret = this.loadTools();
        }
        else if (this.wants(loadflags_1.MTBLoadFlags.Manifest) && !this.has(loadflags_1.MTBLoadFlags.Manifest) && !this.loading(loadflags_1.MTBLoadFlags.Manifest)) {
            this.loading_ |= loadflags_1.MTBLoadFlags.Manifest;
            ret = this.loadManifest();
        }
        else if (this.wants(loadflags_1.MTBLoadFlags.DeviceDB) && !this.has(loadflags_1.MTBLoadFlags.DeviceDB) && !this.loading(loadflags_1.MTBLoadFlags.DeviceDB)) {
            this.loading_ |= loadflags_1.MTBLoadFlags.DeviceDB;
            ret = this.loadDeviceDB();
        }
        return ret;
    }
    loadAppInfo() {
        let ret = new Promise((resolve, reject) => {
            this.logger_.debug('Loading AppInfo');
            if (!this.tools_dir_) {
                this.setupToolsDir();
            }
            if (this.tools_dir_ === undefined) {
                let msg = `loadapp: no tools directory located`;
                this.logger_.error(msg);
                reject(new Error(msg));
            }
            else if (!this.appdir_) {
                let msg = `loadapp: trying to load an application with no application directory`;
                this.logger_.error(msg);
                reject(new Error(msg));
            }
            else {
                this.app_info_ = new mtbappinfo_1.MTBAppInfo(this, this.appdir_);
                this.app_info_.load(this.logger_)
                    .then(() => {
                    resolve();
                })
                    .catch((err) => {
                    reject(err);
                });
            }
            resolve();
        });
        return ret;
    }
    loadPacks() {
        let ret = new Promise(async (resolve, reject) => {
            this.logger_.debug('Loading Packs');
            try {
                let loader = new packdbloader_1.PackDBLoader(this.logger_, this.pack_db_, this.tools_db_);
                let dir = mtbutils_1.MTBUtils.allInfineonDeveloperCenterRegistryDir();
                if (dir !== undefined) {
                    try {
                        await loader.scanDirectory(dir);
                    }
                    catch (err) {
                        this.logger_.error('Error loading packs: ' + err);
                        reject(err);
                        return;
                    }
                }
                dir = mtbutils_1.MTBUtils.userInfineonDeveloperCenterRegistryDir();
                if (dir !== undefined) {
                    try {
                        await loader.scanDirectory(dir);
                    }
                    catch (err) {
                        this.logger_.error('Error loading packs: ' + err);
                        reject(err);
                        return;
                    }
                }
                resolve();
            }
            catch (err) {
                this.logger_.error('Error loading packs: ' + err);
                reject(err);
            }
        });
        return ret;
    }
    loadTools() {
        let ret = new Promise((resolve, reject) => {
            if (this.tools_dir_ === undefined) {
                //
                // If we loaded the application, the tools directory will be set.  If we are not
                // loading an application, we need to set the tools directory to the default location.
                // This is the location where the tools are installed.
                //
                this.setupToolsDir();
            }
            if (this.tools_dir_ === undefined) {
                this.logger_.error('Error loading tools: cannot locate a tools directory');
                reject(new Error('Error loading tools: cannot locate a tools directory'));
                return;
            }
            this.logger_.debug('Loading Tools');
            this.tools_db_.addToolsDir({ dir: this.tools_dir_, source: toolsdb_1.MTBToolSource.ToolsDir });
            for (let packdir of this.pack_db_.getTechPacks().map((pack) => pack.path())) {
                this.tools_db_.addToolsDir({ dir: packdir, source: toolsdb_1.MTBToolSource.TechPack });
            }
            if (this.pack_db_.eap) {
                this.tools_db_.addToolsDir({ dir: this.pack_db_.eap.path(), source: toolsdb_1.MTBToolSource.Eap });
            }
            this.tools_db_.scanAll(this.logger_)
                .then(() => {
                this.tools_db_.setActiveToolSet(this.pack_db_.eap);
                this.loading_ &= ~loadflags_1.MTBLoadFlags.Tools;
                this.has_ |= loadflags_1.MTBLoadFlags.Tools;
                resolve();
            })
                .catch((err) => {
                this.loading_ &= ~loadflags_1.MTBLoadFlags.Tools;
                reject(err);
            });
        });
        return ret;
    }
    searchToolsDir() {
        let ret = undefined;
        if (this.exe_dir_) {
            let dir = this.exe_dir_;
            while (!mtbutils_1.MTBUtils.isRootPath(dir)) {
                if (dir.match(mtbutils_1.MTBUtils.toolsRegex1) || dir.match(mtbutils_1.MTBUtils.toolsRegex2)) {
                    ret = dir;
                    break;
                }
                dir = path.dirname(dir);
            }
        }
        return ret;
    }
    searchCommonDir() {
        let choices = [];
        let dir = mtbutils_1.MTBUtils.getCommonInstallLocation();
        if (dir !== undefined) {
            for (let one of fs.readdirSync(dir)) {
                let fullpath = path.join(dir, one);
                if (one.match(mtbutils_1.MTBUtils.toolsRegex1) || one.match(mtbutils_1.MTBUtils.toolsRegex2)) {
                    choices.push(fullpath);
                }
            }
        }
        let picked = undefined;
        let curver = undefined;
        let prefix = 'tools_';
        for (let one of choices) {
            let vstr = path.basename(one);
            if (!vstr.startsWith(prefix)) {
                continue;
            }
            let ver = mtbversion_1.MTBVersion.fromToolsVersionString(vstr);
            if (ver !== undefined) {
                if (curver === undefined || mtbversion_1.MTBVersion.compare(ver, curver) > 0) {
                    curver = ver;
                    picked = one;
                }
            }
        }
        return picked;
    }
    cyToolsPathDir() {
        let ret = undefined;
        if (process.env.CY_TOOLS_PATHS) {
            let dirpaths = process.env.CY_TOOLS_PATHS.split(' ');
            for (let dirpath of dirpaths) {
                if (fs.existsSync(dirpath)) {
                    ret = path.normalize(dirpath);
                    break;
                }
            }
        }
        return ret;
    }
    setupToolsDir() {
        let exeToolsDir = this.searchToolsDir();
        let toolspathDir = this.cyToolsPathDir();
        let commonDir = this.searchCommonDir();
        if (this.requested_tools_dir_ !== undefined) {
            this.tools_dir_ = this.requested_tools_dir_;
        }
        else if (exeToolsDir) {
            this.tools_dir_ = exeToolsDir;
        }
        else if (toolspathDir) {
            this.tools_dir_ = toolspathDir;
        }
        else if (commonDir) {
            this.tools_dir_ = commonDir;
        }
    }
    loadManifest() {
        let ret = new Promise((resolve, reject) => {
            this.logger_.debug('Loading Manifest');
            this.manifest_db_.loadManifestData(this.logger_, [ModusToolboxEnvironment.mtbDefaultManifest, ...this.pack_db_.getManifestFiles()])
                .then(() => {
                this.loading_ &= ~loadflags_1.MTBLoadFlags.Manifest;
                this.has_ |= loadflags_1.MTBLoadFlags.Manifest;
                resolve();
            })
                .catch((err) => {
                this.loading_ &= ~loadflags_1.MTBLoadFlags.Manifest;
                reject(err);
            });
        });
        return ret;
    }
    loadDeviceDB() {
        let ret = new Promise((resolve, reject) => {
            this.logger_.debug('Loading DeviceDB');
            resolve();
        });
        return ret;
    }
}
exports.ModusToolboxEnvironment = ModusToolboxEnvironment;
//# sourceMappingURL=mtbenv.js.map