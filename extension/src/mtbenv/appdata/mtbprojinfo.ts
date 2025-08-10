import * as path from 'path' ;
import * as fs from 'fs' ;
import { MTBNames } from "../misc/mtbnames";
import { MTBUtils } from "../misc/mtbutils";
import { MTBAssetRequest, MTBAssetRequestLocation, MTBAssetStorageFormat } from './mtbassetreq';
import { MTBBspInstance } from './mtbbspinst';
import { MTBAssetInstance } from './mtbassetinst';
import { MTBAppInfo } from './mtbappinfo';
import { MTBDirectoryList } from './mtbdirlist';
import { MTBAssetInstStore } from './mtbassetinststore';
import * as winston from 'winston';

interface mtbAssetFile {
    name: string,
    direct: boolean
}

export class MTBProjectInfo {
    static readonly ExpandIngorePathPrefix = '$(SEARCH_' ;

    private rootdir_ : string ;
    private vars_ : Map<string, string> ;
    private components_? : string[] ;
    private asset_search_path_ : string[] = [] ;
    private user_search_path_ : string[] = [] ;
    private ignore_path_ : string[] = [] ;

    private appinfo_ : MTBAppInfo ;

    private add_back_path2_ : string[] = [] ;
    private asset_requests_ : MTBAssetRequest[] = [] ;
    private bsp_instances_ : MTBBspInstance[] = [] ;
    private asset_instances_ : MTBAssetInstStore = new MTBAssetInstStore() ;
    private missing_assets_ : MTBAssetRequest[] = [] ;

    private dir_list_? : MTBDirectoryList ;

    private static required_vars_: string[] = [
        MTBNames.MTB_TYPE, MTBNames.MTB_DEVICE, MTBNames.MTB_ADDITIONAL_DEVICES, MTBNames.MTB_SEARCH, MTBNames.MTB_TARGET,
        MTBNames.MTB_APP_NAME, MTBNames.MTB_LIBS, MTBNames.MTB_DEPS, MTBNames.MTB_WKS_SHARED_NAME,
        MTBNames.MTB_WKS_SHARED_DIR, MTBNames.MTB_FLOW_VERSION, MTBNames.MTB_TOOLS_DIR, MTBNames.MTB_IGNORE_EARLY_ACCESS_PACKS,
        MTBNames.MTB_CORE_TYPE, MTBNames.MTB_CORE_NAME, MTBNames.MTB_CORE_CONFIG, MTBNames.MTB_BUILD_SUPPORT, 
        MTBNames.MTB_GLOBAL_DIR, MTBNames.MTB_APP_PATH, MTBNames.MTB_DEVICE_PROGRAM_IDS, MTBNames.MTB_TOOLCHAIN, 
        MTBNames.MTB_CONFIG
    ]

    private static default_vars_ : Map<string, string> = new Map([
        [MTBNames.MTB_IGNORE_EARLY_ACCESS_PACKS, 'FALSE'],
        [MTBNames.MTB_TOOLS_MAKE, ''],
        [MTBNames.MTB_FLOW_VERSION, '1'],
        [MTBNames.MTB_DEVICE_PROGRAM_IDS, ''],
        [MTBNames.MTB_TOOLS_MAKE, 'FALSE'],
        [MTBNames.MTB_APP_PATH, ''],
        [MTBNames.MTB_CORE_CONFIG, ''],
        [MTBNames.MTB_GLOBAL_DIR, ''],
        [MTBNames.MTB_DEVICE_PROGRAM_IDS, ''],
        [MTBNames.MTB_CORE_TYPE, ''],
        [MTBNames.MTB_CORE_NAME, ''],
        [MTBNames.MTB_BUILD_SUPPORT, 'UNKNOWN'],
        [MTBNames.MTB_ADDITIONAL_DEVICES, ''],
    ]) ;

    constructor(app: MTBAppInfo, dir: string, vars: Map<string, string>) {
        this.appinfo_ = app ;
        this.rootdir_ = dir ;
        this.vars_ = vars ;
    }

    public get assetsRequests() : MTBAssetRequest[] {
        return this.asset_requests_ ;   
    }

    public get name() : string {
        return path.basename(this.rootdir_) ;
    }

    public get bspName() : string | undefined {
        if (this.bsp_instances_.length === 0 || this.bsp_instances_.length > 1) {
            return undefined ;
        }
        return this.bsp_instances_[0].name ;
    }

    public get missingAssets() : MTBAssetRequest[] {
        return this.missing_assets_ ;
    }

    public get dirList() : MTBDirectoryList {
        if (!this.dir_list_) {
            let localdir = this.rootdir_ ;
            let shareddir = this.shareddir() ;
            let globaldir = this.globaldir() ;
            this.dir_list_ = new MTBDirectoryList(this.rootdir_, localdir, shareddir, globaldir) ;
        }
        return this.dir_list_ ;
    }

    public searchPath() : string[] {
        return [ ... this.user_search_path_, ...this.asset_search_path_ ] ;
    }

    public ignorePath() : string[] {
        return this.ignore_path_ ;
    }

    public get target() : string {
        return this.vars_.get(MTBNames.MTB_TARGET)! ;
    }

    public get toolchain() : string {
        return this.vars_.get(MTBNames.MTB_TOOLCHAIN)! ;
    }

    public libdir() : string {
        let ret = this.vars_.get(MTBNames.MTB_LIBS)! ;
        if (!path.isAbsolute(ret)) {
            ret = path.join(this.rootdir_, ret) ;
        }
        return ret;
    }

    public depsdir() : string {
        let ret = this.vars_.get(MTBNames.MTB_DEPS)! ;
        if (!path.isAbsolute(ret)) {
            ret = path.join(this.rootdir_, ret) ;
        }
        return ret;
    }

    public importdir() : string {
        let ret = this.vars_.get(MTBNames.ImportDir)! ;
        if (!path.isAbsolute(ret)) {
            ret = path.join(this.rootdir_, ret) ;
        }
        return ret;
    }

    public shareddir() : string {
        let shdir = this.vars_.get(MTBNames.MTB_WKS_SHARED_DIR)! ;
        let shname = this.vars_.get(MTBNames.MTB_WKS_SHARED_NAME)! ;
        let ret = path.join(shdir, shname) ;
        if (!path.isAbsolute(ret)) {
            ret = path.join(this.rootdir_, ret) ;
        }

        return ret;
    }

    public globaldir() : string {
        return this.vars_.get(MTBNames.MTB_GLOBAL_DIR)! ;
    }

    public userSuppliedSearchPath() : string[] {
        let ret : string[] = [] ;

        if (this.vars_.has(MTBNames.MTB_SEARCH)) {
            let v = this.vars_.get(MTBNames.MTB_SEARCH)!;
            ret = v.split(' ') ;
        }
        return ret;
    }

    public userSuppliedIgnorePath() : string[] {
        let ret : string[] = [] ;

        if (this.vars_.has(MTBNames.MTB_IGNORE)) {
            let v = this.vars_.get(MTBNames.MTB_IGNORE)!;
            ret = v.split(' ') ;
        }
        return ret;
    }

    public buildPath() : string {
        let ret = path.join(this.rootdir_, MTBNames.DefaultBuildDir) ;
        if (this.vars_.has(MTBNames.MTB_BUILD_LOCATION)) {
            ret = this.vars_.get(MTBNames.MTB_BUILD_LOCATION)! ;
            if (!path.isAbsolute(ret)) {
                ret = path.join(this.rootdir_, ret) ;
            }
        }

        return ret;
    }

    public components() : string[] {
        if (!this.components_) {
            let comps : string[] = [] ;
            if (this.vars_.has(MTBNames.MTB_COMPONENTS)) {
                comps = this.vars_.get(MTBNames.MTB_COMPONENTS)!.split(' ') ;
            }

            //
            // Remove duplicate values from the components array and then remove the disabled values
            //
            this.components_ = MTBUtils.removeValuesFromArray([...new Set(comps)], this.disabledComponents()) ;
        }
        return this.components_! ;
    }

    public disabledComponents() : string[] {
        let ret : string [] = [] ;

        if (this.vars_.has(MTBNames.MTB_DISABLED_COMPONENTS)) {
            ret = this.vars_.get(MTBNames.MTB_DISABLED_COMPONENTS)!.split(' ') ;
        }

        // This removes duplicate values
        ret = [... new Set(ret)] ;

        return ret;
    }

    public hasCoreMake() : boolean {
        let ret = false ;

        let tm = this.vars_.get(MTBNames.MTB_TOOLS_MAKE) ;
        if (tm && tm.length > 0 && tm?.toLowerCase().startsWith('f')) {
            ret = true ;
        }

        return ret;
    }

    public isValid() : Error | undefined {
        let msg = '' ;
        let ret = undefined ;

        for(let v of MTBProjectInfo.default_vars_.keys()) {
            if (!this.vars_.has(v)) {
                this.vars_.set(v, MTBProjectInfo.default_vars_.get(v)!) ;
            }
        }

        for(let v of MTBProjectInfo.required_vars_) {
            if (!this.vars_.has(v)) {
                if (msg.length > 0) {
                    msg += '\n' ;
                }

                msg += `the project does not have an '${v}' value` ;
            }
        }

        if (msg.length) {
            ret = new Error(msg) ;
        }

        return ret ;
    }

    public initialize(logger: winston.Logger) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (!fs.existsSync(this.depsdir())) {
                fs.mkdirSync(this.depsdir()) ;
                if (!fs.existsSync(this.depsdir())) {
                    let msg = `loadapp: unable to create the dependencies directory ${this.depsdir()}` ;
                    logger.error(msg) ;
                    reject(new Error(msg)) ;
                }
            }

            this.clearState() ;
            this.readMTBFiles(logger)
                .then(() => {
                    this.setupSearchPaths(logger) ;
                    resolve() ;
                })
                .catch((err) => {
                    reject(err) ;
                })
        }) ;
        return ret;
    }

    private addMtbFileToSearch() {
        let target = MTBNames.TARGET_PREFIX + this.target ;

        for(let req of this.asset_requests_) {
            if (req.locationType() !== MTBAssetRequestLocation.LOCAL) {
                continue ;
            }

            if (req.isBSP() && req.repoName() !== target) {
                continue ;
            }

            let clonedir = req.cloneDir(this.dirList) ;
            this.asset_search_path_.push(clonedir) ;
        }

        for(let req of this.asset_requests_) {
            if (req.locationType() === MTBAssetRequestLocation.LOCAL) {
                continue ;
            }

            if (req.isBSP() && req.repoName() !== target) {
                continue ;
            }

            let dir = req.fullPath(this.dirList) ;
            this.asset_search_path_.push(dir) ;
        }
    }

    private createAbsoluteList(list: string[]) : string[] {
        let ret : string[] = [] ;
        for(let item of list) {
            if (!path.isAbsolute(item)) {
                let abs = path.join(this.rootdir_, item) ;
                if (fs.existsSync(abs)) {
                    ret.push(abs) ;
                }
            }
        }
        return ret ;
    }

    private setupSearchPaths(logger: winston.Logger) {
        this.asset_search_path_ = [] ;
        this.user_search_path_ = [] ;

        if (this.rootdir_ !== this.appinfo_.appdir) {
            let bspdir = path.join(this.appinfo_.appdir, MTBNames.BSPsDir) ;
            this.user_search_path_.push(bspdir) ;
        }

        let apppath = this.vars_.get(MTBNames.MTB_APP_PATH) ;
        if (!apppath || apppath.length == 0) {
            this.user_search_path_.push(this.rootdir_) ;
        }
        else {
            if (fs.existsSync(apppath)) {
                this.user_search_path_.push(apppath) ;
            }   
        }

        this.user_search_path_ = this.createAbsoluteList(this.userSuppliedSearchPath()) ;
        this.addMtbFileToSearch() ;

        this.ignore_path_ = this.createAbsoluteList(this.userSuppliedIgnorePath()) ;

        this.findCyIgnoreFiles(logger, this.searchPath(), this.ignore_path_) ;
        this.findBSPInstances(logger) ;
        this.findAssetInstances(logger) ;
        this.processCurrentBSP(logger) ;
        this.filterAddBackPaths() ;
    }

    /**
     * This method is used to filter the add back paths.  If there are any paths in the add back path list that
     * are not found under an ignore path, they are removed from the list.
     */
    private filterAddBackPaths() {
        for(let p of this.add_back_path2_) {
            for(let ignore of this.ignore_path_) {
                if (p.startsWith(ignore)) {
                    this.add_back_path2_.splice(this.add_back_path2_.indexOf(p), 1);
                    break;
                }
            }
        }
    }

    private expandPath(line: string) : string | Error | null {
        let ret = line ;

        let start = line.indexOf(MTBProjectInfo.ExpandIngorePathPrefix) ;
        if (start === -1) {
            return ret ;
        }

        let end = line.indexOf(')', start) ;
        if (end === -1) {
            return new Error(`invalid ignore path '${line}'`) ;
        }

        let varname = line.substring(start + MTBProjectInfo.ExpandIngorePathPrefix.length, end) ;
        let asset = this.asset_requests_.find((req) => { return req.name() === varname ;}) ;
        if (!asset) {
            return null ;
        }

        ret = line.substring(0, start) + asset.fullPath(this.dirList) + line.substring(end + 1) ;
        return ret ;
    }

    private readCyIgnoreFile(logger: winston.Logger, fpath: string, ignorePath: string[]) {
        let text = fs.readFileSync(fpath, 'utf8') ;
        let lines = text.split('\n') ;
        for(let line of lines) {
            line = line.trim() ;
            if (line.length === 0) {
                continue ;
            }

            if (line.startsWith('#')) {
                continue ;
            }

            let dirpath = path.dirname(fpath) ;
            if (line.indexOf(MTBProjectInfo.ExpandIngorePathPrefix) === 0) {
                let result = this.expandPath(line) ;
                if (result instanceof Error) {
                    let err = result as Error ;
                    let msg = `loadapp: error reading cyignore file '${fpath}' - ${err.message}` ;
                    logger.error(msg) ;
                    continue ;
                }
                else if (result === null) {
                    continue ;
                }

                line = result as string ;
            }

            if (path.isAbsolute(line)) {
                ignorePath.push(line) ;
            }
            else {
                let abs = path.join(dirpath, line) ;
                if (fs.existsSync(abs)) {
                    ignorePath.push(abs) ;
                }
            }
        }
    }

    private findCyIgnoreFiles(logger: winston.Logger, searchPath: string[], ignorePath: string[]) {
        for(let one of this.searchPath()) {
            let fpath = path.join(one, MTBNames.CY_IGNORE_FILE) ;
            if (fs.existsSync(fpath) && fs.statSync(fpath).isFile()) {
                this.readCyIgnoreFile(logger, fpath, ignorePath) ;
            }
        }
    }

    private specialCaseTargetCommit(asset: string) : boolean {
        let parent = path.dirname(asset) ;
        let target = parent.substring(asset.indexOf(MTBNames.TARGET_PREFIX)) ;
        let mkfile = path.join(asset, target + '.mk') ;
        return fs.existsSync(mkfile) && fs.statSync(mkfile).isFile() ;
    }

    private addBspInstance(logger: winston.Logger, bsppath: string) {
        let bsp = this.bsp_instances_.find((b) => { return b.rootdir === bsppath ;}) ;

        if (!bsp) {
            try {
                let mkpath = path.join(bsppath, MTBNames.BSP_MK_FILE) ;
                if (fs.existsSync(mkpath) && fs.statSync(mkpath).isFile()) {
                    let inst = MTBBspInstance.createFromPath(bsppath) ;
                    this.bsp_instances_.push(inst) ;
                }
            }
            catch (err) {
                let errobj = err as Error ;
                let msg = `loadapp: error creating BSP instance '${bsppath}' - ${errobj.message}` ;
                logger.error(msg) ;
            }
        }
    }

    private findBSPsCandidateDirsFromAssets() : string [] {
        let ret: string[] = [] ;
        for(let asset of this.searchPath()) {
            if (!fs.existsSync(asset) || !fs.statSync(asset).isDirectory()) {
                continue ;
            }

            if (path.dirname(asset).startsWith(MTBNames.TARGET_PREFIX) && this.specialCaseTargetCommit(asset)) {
                ret.push(asset) ;
                continue ;
            }
        }

        return ret ;
    }

    private findBSPsfromBSPDir() : string[] {
        let ret : string [] = [] ;

        for(let dirs of fs.readdirSync(this.appinfo_.bspdir)) {
            let fpath = path.join(this.appinfo_.bspdir, dirs) ;
            if (fs.statSync(fpath).isDirectory()) {
                    ret.push(fpath) ;
            }
        }

        return ret ;
    }

    private findBSPInstances(logger: winston.Logger) : void {
        let candidates = [...this.findBSPsCandidateDirsFromAssets(), ...this.findBSPsfromBSPDir()] ;
        for(let bspcandidate of candidates) {
            this.addBspInstance(logger, bspcandidate) ;
        }
    }

    private findAssetInstances(logger: winston.Logger) : void {
        for(let req of this.asset_requests_) {
            let found = false ;
            let fpath = req.fullPath(this.dir_list_!) ;
            if (fs.existsSync(fpath)) {
                let inst = this.asset_instances_.getAssetInstance(fpath) ;
                if (!inst) {
                    this.asset_instances_.addAssetInstance(new MTBAssetInstance(fpath)) ;
                    found = true ;
                }
            }

            if (!found) {
                this.missing_assets_.push(req) ;
                let msg = `loadapp: asset '${req.name()}' not found in search path` ;
                logger.debug(msg) ;
            }
        }
    }

    public get targetBSPInstance() : MTBBspInstance | undefined {
        let ret : MTBBspInstance | undefined = undefined ;
        let tname = MTBNames.TARGET_PREFIX + this.target ;

        for(let inst of this.bsp_instances_) {
            if (inst.name === tname) {
                return inst ;
            }
        }
        return ret ;
    }

    private processCurrentBSP(logger: winston.Logger) : void {
        let bspinst = this.targetBSPInstance ;
        if (bspinst && bspinst.rootdir) {
            // Process the .cyignore file is one exists
            let ignfile = path.join(bspinst.rootdir, MTBNames.CY_IGNORE_FILE) ;
            if (fs.existsSync(ignfile)) {
                this.readCyIgnoreFile(logger, ignfile, this.ignore_path_) ;
            }
        }
    }

    private findMTBFiles() : mtbAssetFile[] {
        let ret : mtbAssetFile[] = [] ;

        for(let dir of fs.readdirSync(this.depsdir())) {
            if (path.extname(dir) === '.mtb') {
                let f = path.join(this.depsdir(), dir) ;
                if (fs.existsSync(f)) {
                    ret.push({ name: f, direct: true }) ;
                }
            }
        }

        for(let dir of fs.readdirSync(this.libdir())) {
            if (path.extname(dir) === '.mtb') {
                let f = path.join(this.libdir(), dir) ;
                if (fs.existsSync(f)) {
                    ret.push({ name: f, direct: false} ) ;
                }
            }
        }

        return ret;
    }

    private readMTBFiles(logger: winston.Logger) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            let errs : Error[] = [] ;
            let files = this.findMTBFiles() ;
            for(let file of files) {
                try {
                    let req = MTBAssetRequest.createFromFile(file.name, MTBAssetStorageFormat.MTB, file.direct) ;
                    this.asset_requests_.push(req) ;
                }
                catch(err) {
                    let errobj = err as Error ;
                    let msg = `loadapp: error reading mtb file '${file.name}' - ${errobj.message}` ;
                    logger.error(msg) ;
                    errs.push(errobj) ;
                }
            }

            if (errs.length > 0) {
                let msg = 'loadapp: errors reading mtb files:\n' ;
                for(let err of errs) {
                    msg += `  - ${err.message}\n` ;
                }
                reject(new Error(msg)) ;
            }
            resolve() ;
        }) ;
        return ret;
    }

    private clearState() {
        this.asset_search_path_ = [] ;
        this.user_search_path_ = [] ;
        this.add_back_path2_ = [] ;
        this.asset_requests_ = [] ;
        this.asset_instances_.clear() ;
        this.bsp_instances_ = [] ;
        this.missing_assets_ = [] ;
    }
}