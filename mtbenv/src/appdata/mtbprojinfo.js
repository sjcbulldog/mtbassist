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
exports.MTBProjectInfo = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const mtbnames_1 = require("../misc/mtbnames");
const mtbutils_1 = require("../misc/mtbutils");
const mtbassetreq_1 = require("./mtbassetreq");
const mtbbspinst_1 = require("./mtbbspinst");
const mtbassetinst_1 = require("./mtbassetinst");
const mtbdirlist_1 = require("./mtbdirlist");
const mtbassetinststore_1 = require("./mtbassetinststore");
class MTBProjectInfo {
    static ExpandIngorePathPrefix = '$(SEARCH_';
    rootdir_;
    vars_;
    components_;
    asset_search_path_ = [];
    user_search_path_ = [];
    ignore_path_ = [];
    appinfo_;
    add_back_path2_ = [];
    asset_requests_ = [];
    bsp_instances_ = [];
    asset_instances_ = new mtbassetinststore_1.MTBAssetInstStore();
    missing_assets_ = [];
    dir_list_;
    static required_vars_ = [
        mtbnames_1.MTBNames.MTB_TYPE, mtbnames_1.MTBNames.MTB_DEVICE, mtbnames_1.MTBNames.MTB_ADDITIONAL_DEVICES, mtbnames_1.MTBNames.MTB_SEARCH, mtbnames_1.MTBNames.MTB_TARGET,
        mtbnames_1.MTBNames.MTB_APP_NAME, mtbnames_1.MTBNames.MTB_LIBS, mtbnames_1.MTBNames.MTB_DEPS, mtbnames_1.MTBNames.MTB_WKS_SHARED_NAME,
        mtbnames_1.MTBNames.MTB_WKS_SHARED_DIR, mtbnames_1.MTBNames.MTB_FLOW_VERSION, mtbnames_1.MTBNames.MTB_TOOLS_DIR, mtbnames_1.MTBNames.MTB_IGNORE_EARLY_ACCESS_PACKS,
        mtbnames_1.MTBNames.MTB_CORE_TYPE, mtbnames_1.MTBNames.MTB_CORE_NAME, mtbnames_1.MTBNames.MTB_CORE_CONFIG, mtbnames_1.MTBNames.MTB_BUILD_SUPPORT,
        mtbnames_1.MTBNames.MTB_GLOBAL_DIR, mtbnames_1.MTBNames.MTB_APP_PATH, mtbnames_1.MTBNames.MTB_DEVICE_PROGRAM_IDS, mtbnames_1.MTBNames.MTB_TOOLCHAIN,
        mtbnames_1.MTBNames.MTB_CONFIG
    ];
    static default_vars_ = new Map([
        [mtbnames_1.MTBNames.MTB_IGNORE_EARLY_ACCESS_PACKS, 'FALSE'],
        [mtbnames_1.MTBNames.MTB_TOOLS_MAKE, ''],
        [mtbnames_1.MTBNames.MTB_FLOW_VERSION, '1'],
        [mtbnames_1.MTBNames.MTB_DEVICE_PROGRAM_IDS, ''],
        [mtbnames_1.MTBNames.MTB_TOOLS_MAKE, 'FALSE'],
        [mtbnames_1.MTBNames.MTB_APP_PATH, ''],
        [mtbnames_1.MTBNames.MTB_CORE_CONFIG, ''],
        [mtbnames_1.MTBNames.MTB_GLOBAL_DIR, ''],
        [mtbnames_1.MTBNames.MTB_DEVICE_PROGRAM_IDS, ''],
        [mtbnames_1.MTBNames.MTB_CORE_TYPE, ''],
        [mtbnames_1.MTBNames.MTB_CORE_NAME, ''],
        [mtbnames_1.MTBNames.MTB_BUILD_SUPPORT, 'UNKNOWN'],
        [mtbnames_1.MTBNames.MTB_ADDITIONAL_DEVICES, ''],
    ]);
    constructor(app, dir, vars) {
        this.appinfo_ = app;
        this.rootdir_ = dir;
        this.vars_ = vars;
    }
    get missingAssets() {
        return this.missing_assets_;
    }
    get dirList() {
        if (!this.dir_list_) {
            let localdir = this.rootdir_;
            let shareddir = this.shareddir();
            let globaldir = this.globaldir();
            this.dir_list_ = new mtbdirlist_1.MTBDirectoryList(this.rootdir_, localdir, shareddir, globaldir);
        }
        return this.dir_list_;
    }
    searchPath() {
        return [...this.user_search_path_, ...this.asset_search_path_];
    }
    ignorePath() {
        return this.ignore_path_;
    }
    get target() {
        return this.vars_.get(mtbnames_1.MTBNames.MTB_TARGET);
    }
    get toolchain() {
        return this.vars_.get(mtbnames_1.MTBNames.MTB_TOOLCHAIN);
    }
    libdir() {
        let ret = this.vars_.get(mtbnames_1.MTBNames.MTB_LIBS);
        if (!path.isAbsolute(ret)) {
            ret = path.join(this.rootdir_, ret);
        }
        return ret;
    }
    depsdir() {
        let ret = this.vars_.get(mtbnames_1.MTBNames.MTB_DEPS);
        if (!path.isAbsolute(ret)) {
            ret = path.join(this.rootdir_, ret);
        }
        return ret;
    }
    importdir() {
        let ret = this.vars_.get(mtbnames_1.MTBNames.ImportDir);
        if (!path.isAbsolute(ret)) {
            ret = path.join(this.rootdir_, ret);
        }
        return ret;
    }
    shareddir() {
        let shdir = this.vars_.get(mtbnames_1.MTBNames.MTB_WKS_SHARED_DIR);
        let shname = this.vars_.get(mtbnames_1.MTBNames.MTB_WKS_SHARED_NAME);
        let ret = path.join(shdir, shname);
        if (!path.isAbsolute(ret)) {
            ret = path.join(this.rootdir_, ret);
        }
        return ret;
    }
    globaldir() {
        return this.vars_.get(mtbnames_1.MTBNames.MTB_GLOBAL_DIR);
    }
    userSuppliedSearchPath() {
        let ret = [];
        if (this.vars_.has(mtbnames_1.MTBNames.MTB_SEARCH)) {
            let v = this.vars_.get(mtbnames_1.MTBNames.MTB_SEARCH);
            ret = v.split(' ');
        }
        return ret;
    }
    userSuppliedIgnorePath() {
        let ret = [];
        if (this.vars_.has(mtbnames_1.MTBNames.MTB_IGNORE)) {
            let v = this.vars_.get(mtbnames_1.MTBNames.MTB_IGNORE);
            ret = v.split(' ');
        }
        return ret;
    }
    buildPath() {
        let ret = path.join(this.rootdir_, mtbnames_1.MTBNames.DefaultBuildDir);
        if (this.vars_.has(mtbnames_1.MTBNames.MTB_BUILD_LOCATION)) {
            ret = this.vars_.get(mtbnames_1.MTBNames.MTB_BUILD_LOCATION);
            if (!path.isAbsolute(ret)) {
                ret = path.join(this.rootdir_, ret);
            }
        }
        return ret;
    }
    components() {
        if (!this.components_) {
            let comps = [];
            if (this.vars_.has(mtbnames_1.MTBNames.MTB_COMPONENTS)) {
                comps = this.vars_.get(mtbnames_1.MTBNames.MTB_COMPONENTS).split(' ');
            }
            //
            // Remove duplicate values from the components array and then remove the disabled values
            //
            this.components_ = mtbutils_1.MTBUtils.removeValuesFromArray([...new Set(comps)], this.disabledComponents());
        }
        return this.components_;
    }
    disabledComponents() {
        let ret = [];
        if (this.vars_.has(mtbnames_1.MTBNames.MTB_DISABLED_COMPONENTS)) {
            ret = this.vars_.get(mtbnames_1.MTBNames.MTB_DISABLED_COMPONENTS).split(' ');
        }
        // This removes duplicate values
        ret = [...new Set(ret)];
        return ret;
    }
    hasCoreMake() {
        let ret = false;
        let tm = this.vars_.get(mtbnames_1.MTBNames.MTB_TOOLS_MAKE);
        if (tm && tm.length > 0 && tm?.toLowerCase().startsWith('f')) {
            ret = true;
        }
        return ret;
    }
    isValid() {
        let msg = '';
        let ret = undefined;
        for (let v of MTBProjectInfo.default_vars_.keys()) {
            if (!this.vars_.has(v)) {
                this.vars_.set(v, MTBProjectInfo.default_vars_.get(v));
            }
        }
        for (let v of MTBProjectInfo.required_vars_) {
            if (!this.vars_.has(v)) {
                if (msg.length > 0) {
                    msg += '\n';
                }
                msg += `the project does not have an '${v}' value`;
            }
        }
        if (msg.length) {
            ret = new Error(msg);
        }
        return ret;
    }
    initialize(logger) {
        let ret = new Promise((resolve, reject) => {
            if (!fs.existsSync(this.depsdir())) {
                fs.mkdirSync(this.depsdir());
                if (!fs.existsSync(this.depsdir())) {
                    let msg = `loadapp: unable to create the dependencies directory ${this.depsdir()}`;
                    logger.error(msg);
                    reject(new Error(msg));
                }
            }
            this.clearState();
            this.readMTBFiles(logger)
                .then(() => {
                this.setupSearchPaths(logger);
                resolve();
            })
                .catch((err) => {
                reject(err);
            });
        });
        return ret;
    }
    addMtbFileToSearch() {
        let target = mtbnames_1.MTBNames.TARGET_PREFIX + this.target;
        for (let req of this.asset_requests_) {
            if (req.locationType() !== mtbassetreq_1.MTBAssetRequestLocation.LOCAL) {
                continue;
            }
            if (req.isBSP() && req.repoName() !== target) {
                continue;
            }
            let clonedir = req.cloneDir(this.dirList);
            this.asset_search_path_.push(clonedir);
        }
        for (let req of this.asset_requests_) {
            if (req.locationType() === mtbassetreq_1.MTBAssetRequestLocation.LOCAL) {
                continue;
            }
            if (req.isBSP() && req.repoName() !== target) {
                continue;
            }
            let dir = req.fullPath(this.dirList);
            this.asset_search_path_.push(dir);
        }
    }
    createAbsoluteList(list) {
        let ret = [];
        for (let item of list) {
            if (!path.isAbsolute(item)) {
                let abs = path.join(this.rootdir_, item);
                if (fs.existsSync(abs)) {
                    ret.push(abs);
                }
            }
        }
        return ret;
    }
    setupSearchPaths(logger) {
        this.asset_search_path_ = [];
        this.user_search_path_ = [];
        if (this.rootdir_ !== this.appinfo_.appdir) {
            let bspdir = path.join(this.appinfo_.appdir, mtbnames_1.MTBNames.BSPsDir);
            this.user_search_path_.push(bspdir);
        }
        let apppath = this.vars_.get(mtbnames_1.MTBNames.MTB_APP_PATH);
        if (!apppath || apppath.length == 0) {
            this.user_search_path_.push(this.rootdir_);
        }
        else {
            if (fs.existsSync(apppath)) {
                this.user_search_path_.push(apppath);
            }
        }
        this.user_search_path_ = this.createAbsoluteList(this.userSuppliedSearchPath());
        this.addMtbFileToSearch();
        this.ignore_path_ = this.createAbsoluteList(this.userSuppliedIgnorePath());
        this.findCyIgnoreFiles(logger, this.searchPath(), this.ignore_path_);
        this.findBSPInstances(logger);
        this.findAssetInstances(logger);
        this.processCurrentBSP(logger);
        this.filterAddBackPaths();
    }
    /**
     * This method is used to filter the add back paths.  If there are any paths in the add back path list that
     * are not found under an ignore path, they are removed from the list.
     */
    filterAddBackPaths() {
        for (let p of this.add_back_path2_) {
            for (let ignore of this.ignore_path_) {
                if (p.startsWith(ignore)) {
                    this.add_back_path2_.splice(this.add_back_path2_.indexOf(p), 1);
                    break;
                }
            }
        }
    }
    expandPath(line) {
        let ret = line;
        let start = line.indexOf(MTBProjectInfo.ExpandIngorePathPrefix);
        if (start === -1) {
            return ret;
        }
        let end = line.indexOf(')', start);
        if (end === -1) {
            return new Error(`invalid ignore path '${line}'`);
        }
        let varname = line.substring(start + MTBProjectInfo.ExpandIngorePathPrefix.length, end);
        let asset = this.asset_requests_.find((req) => { return req.name() === varname; });
        if (!asset) {
            return new Error(`invalid ignore path '${line}' - there is not asset with the name '${varname}'`);
        }
        ret = line.substring(0, start) + asset.fullPath(this.dirList) + line.substring(end + 1);
        return ret;
    }
    readCyIgnoreFile(logger, fpath, ignorePath) {
        let text = fs.readFileSync(fpath, 'utf8');
        let lines = text.split('\n');
        for (let line of lines) {
            line = line.trim();
            if (line.length === 0) {
                continue;
            }
            if (line.startsWith('#')) {
                continue;
            }
            let dirpath = path.dirname(fpath);
            if (line.indexOf(MTBProjectInfo.ExpandIngorePathPrefix) === 0) {
                let result = this.expandPath(line);
                if (result instanceof Error) {
                    let err = result;
                    let msg = `loadapp: error reading cyignore file '${fpath}' - ${err.message}`;
                    logger.error(msg);
                    continue;
                }
                line = result;
            }
            if (path.isAbsolute(line)) {
                ignorePath.push(line);
            }
            else {
                let abs = path.join(dirpath, line);
                if (fs.existsSync(abs)) {
                    ignorePath.push(abs);
                }
            }
        }
    }
    findCyIgnoreFiles(logger, searchPath, ignorePath) {
        for (let one of this.searchPath()) {
            let fpath = path.join(one, mtbnames_1.MTBNames.CY_IGNORE_FILE);
            if (fs.existsSync(fpath) && fs.statSync(fpath).isFile()) {
                this.readCyIgnoreFile(logger, fpath, ignorePath);
            }
        }
    }
    specialCaseTargetCommit(asset) {
        let parent = path.dirname(asset);
        let target = parent.substring(asset.indexOf(mtbnames_1.MTBNames.TARGET_PREFIX));
        let mkfile = path.join(asset, target + '.mk');
        return fs.existsSync(mkfile) && fs.statSync(mkfile).isFile();
    }
    addBspInstance(logger, bsppath) {
        let bsp = this.bsp_instances_.find((b) => { return b.rootdir === bsppath; });
        if (!bsp) {
            try {
                let mkpath = path.join(bsppath, mtbnames_1.MTBNames.BSP_MK_FILE);
                if (fs.existsSync(mkpath) && fs.statSync(mkpath).isFile()) {
                    let inst = mtbbspinst_1.MTBBspInstance.createFromPath(bsppath);
                    this.bsp_instances_.push(inst);
                }
            }
            catch (err) {
                let errobj = err;
                let msg = `loadapp: error creating BSP instance '${bsppath}' - ${errobj.message}`;
                logger.error(msg);
            }
        }
    }
    findBSPsCandidateDirsFromAssets() {
        let ret = [];
        for (let asset of this.searchPath()) {
            if (!fs.existsSync(asset) || !fs.statSync(asset).isDirectory()) {
                continue;
            }
            if (path.dirname(asset).startsWith(mtbnames_1.MTBNames.TARGET_PREFIX) && this.specialCaseTargetCommit(asset)) {
                ret.push(asset);
                continue;
            }
        }
        return ret;
    }
    findBSPsfromBSPDir() {
        let ret = [];
        for (let dirs of fs.readdirSync(this.appinfo_.bspdir)) {
            let fpath = path.join(this.appinfo_.bspdir, dirs);
            if (fs.statSync(fpath).isDirectory()) {
                ret.push(fpath);
            }
        }
        return ret;
    }
    findBSPInstances(logger) {
        let candidates = [...this.findBSPsCandidateDirsFromAssets(), ...this.findBSPsfromBSPDir()];
        for (let bspcandidate of candidates) {
            this.addBspInstance(logger, bspcandidate);
        }
    }
    findAssetInstances(logger) {
        for (let req of this.asset_requests_) {
            let found = false;
            let fpath = req.fullPath(this.dir_list_);
            if (fs.existsSync(fpath)) {
                let inst = this.asset_instances_.getAssetInstance(fpath);
                if (!inst) {
                    this.asset_instances_.addAssetInstance(new mtbassetinst_1.MTBAssetInstance(fpath));
                    found = true;
                }
            }
            if (!found) {
                this.missing_assets_.push(req);
                let msg = `loadapp: asset '${req.name()}' not found in search path`;
                logger.debug(msg);
            }
        }
    }
    get targetBSPInstance() {
        let ret = undefined;
        let tname = mtbnames_1.MTBNames.TARGET_PREFIX + this.target;
        for (let inst of this.bsp_instances_) {
            if (inst.name === tname) {
                return inst;
            }
        }
        return ret;
    }
    processCurrentBSP(logger) {
        let bspinst = this.targetBSPInstance;
        if (bspinst && bspinst.rootdir) {
            // Process the .cyignore file is one exists
            let ignfile = path.join(bspinst.rootdir, mtbnames_1.MTBNames.CY_IGNORE_FILE);
            if (fs.existsSync(ignfile)) {
                this.readCyIgnoreFile(logger, ignfile, this.ignore_path_);
            }
        }
    }
    findMTBFiles() {
        let ret = [];
        for (let dir of fs.readdirSync(this.depsdir())) {
            if (path.extname(dir) === '.mtb') {
                let f = path.join(this.depsdir(), dir);
                if (fs.existsSync(f)) {
                    ret.push({ name: f, direct: true });
                }
            }
        }
        for (let dir of fs.readdirSync(this.libdir())) {
            if (path.extname(dir) === '.mtb') {
                let f = path.join(this.libdir(), dir);
                if (fs.existsSync(f)) {
                    ret.push({ name: f, direct: false });
                }
            }
        }
        return ret;
    }
    readMTBFiles(logger) {
        let ret = new Promise((resolve, reject) => {
            let errs = [];
            let files = this.findMTBFiles();
            for (let file of files) {
                try {
                    let req = mtbassetreq_1.MTBAssetRequest.createFromFile(file.name, mtbassetreq_1.MTBAssetStorageFormat.MTB, file.direct);
                    this.asset_requests_.push(req);
                }
                catch (err) {
                    let errobj = err;
                    let msg = `loadapp: error reading mtb file '${file.name}' - ${errobj.message}`;
                    logger.error(msg);
                    errs.push(errobj);
                }
            }
            if (errs.length > 0) {
                let msg = 'loadapp: errors reading mtb files:\n';
                for (let err of errs) {
                    msg += `  - ${err.message}\n`;
                }
                reject(new Error(msg));
            }
            resolve();
        });
        return ret;
    }
    clearState() {
        this.asset_search_path_ = [];
        this.user_search_path_ = [];
        this.add_back_path2_ = [];
        this.asset_requests_ = [];
        this.asset_instances_.clear();
        this.bsp_instances_ = [];
        this.missing_assets_ = [];
    }
}
exports.MTBProjectInfo = MTBProjectInfo;
//# sourceMappingURL=mtbprojinfo.js.map