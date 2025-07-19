import { MTBLoadFlags } from './loadflags' ;
import { MTBManifestDB } from '../manifest/mtbmanifestdb';
import { PackDB } from '../packdb/packdb';
import { PackDBLoader } from '../packdb/packdbloader';
import { MTBToolSource, ToolsDB } from '../toolsdb/toolsdb';
import { MTBUtils } from '../misc/mtbutils';
import * as path from 'path';
import * as fs from 'fs';
import { MTBVersion } from '../misc/mtbversion';
import { MTBAppInfo } from '../appdata/mtbappinfo';
import { MTBOptProgramCodeGen, MTBTool } from '../toolsdb/mtbtool';
import { MTBCommand } from './mtbcmd';
import winston from 'winston';

export class ModusToolboxEnvironment {
    // Static variables
    private static env_? : ModusToolboxEnvironment ;
    static mtbDefaultManifest: string = "https://modustoolbox.infineon.com/manifests/mtb-super-manifest/v2.X/mtb-super-manifest-fv2.xml";

    // Instance variables
    private isLoading: boolean = false ;
    private appdir_? : string ;
    private wants_ : MTBLoadFlags = MTBLoadFlags.None ;
    private has_ : MTBLoadFlags = MTBLoadFlags.None ;
    private loading_ : MTBLoadFlags = MTBLoadFlags.None ;

    private manifest_db_ : MTBManifestDB ;
    private tools_db_ : ToolsDB ;
    private pack_db_ : PackDB ;
    private app_info_? : MTBAppInfo ;

    private requested_tools_dir_? : string ;
    private exe_dir_? : string ;
    private tools_dir_? : string ;

    private logger_ : winston.Logger ;  

    public static getInstance(logger: winston.Logger, exedir?: string) : ModusToolboxEnvironment | null {
        if (!ModusToolboxEnvironment.env_) {
            ModusToolboxEnvironment.env_ = new ModusToolboxEnvironment(logger, exedir) ;
        }
        else {
            if (exedir && exedir !== ModusToolboxEnvironment.env_.exe_dir_) {
                logger.error('ModusToolboxEnvironment already created with a different executable directory') ;
                logger.error(`    Current: ${ModusToolboxEnvironment.env_.exe_dir_}, New: ${exedir}`) ;
                return null ;
            }

            if (ModusToolboxEnvironment.env_.logger_ !== logger) {
                ModusToolboxEnvironment.env_.logger_ = logger ;
            }
        }

        return ModusToolboxEnvironment.env_ ;
    }

    private constructor(logger: winston.Logger, exedir?: string) {
        this.logger_ = logger ; 
        this.tools_db_ = new ToolsDB() ;
        this.pack_db_ = new PackDB() ;
        this.manifest_db_ = new MTBManifestDB() ;

        this.exe_dir_ = exedir ;
        if (this.exe_dir_) {
            this.exe_dir_ = path.normalize(this.exe_dir_) ;
        }
        this.logger_ = logger ;
    }

    public destroy() {
        ModusToolboxEnvironment.env_ = undefined ;
    }

    public get manifestDB() : MTBManifestDB {
        return this.manifest_db_ ;
    }

    public get toolsDB() : ToolsDB {
        return this.tools_db_ ;
    }

    public get packDB() : PackDB {
        return this.pack_db_ ;
    }

    public get appInfo() : MTBAppInfo | undefined {
        return this.app_info_ ;
    }

    public setRequestedToolsDir(dir: string) {
        this.requested_tools_dir_ = dir ;
    }

    public toolsDir() : string | undefined {
        return this.tools_dir_ ;
    }

    public load(flags: MTBLoadFlags, appdir?: string) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (this.isLoading) {
                reject('ModusToolboxEnvironment is already loading') ;
                return ;
            }

            this.isLoading = true ;
            this.appdir_ = appdir ;
            this.wants_ = flags ;

            this.loadPacks()
                .then(() => {
                    let plist = [] ;
                    while (true) {
                        let p = this.nextStep() ;
                        if (p === undefined) {
                            break ;
                        }
                        plist.push(p) ;
                    }

                    Promise.all(plist)
                        .then(() => {
                            this.isLoading = false ;
                            this.wants_ = MTBLoadFlags.None ;
                            resolve() ;
                        })
                        .catch((err) => {
                            this.isLoading = false ;
                            this.wants_ = MTBLoadFlags.None ;
                            reject(err) ;
                        }) ;
                })
                .catch((err) => {
                    this.logger_.error( 'Error loading packs: ' + err) ;
                    reject(err) ;
                }) ;
        }) ;
        return ret ;
    }

    private checkLoadFlag(flags: MTBLoadFlags, mask: MTBLoadFlags) : boolean {
        return (flags & mask) === mask ;
    }

    private wants(flags: MTBLoadFlags) : boolean {
        return this.checkLoadFlag(this.wants_, flags) ;
    }

    public has(flags: MTBLoadFlags) : boolean {
        return this.checkLoadFlag(this.has_, flags) ;
    }

    public loading(flags: MTBLoadFlags) : boolean {
        return this.checkLoadFlag(this.loading_, flags) ;
    }

    public executeCommand(cmd: MTBCommand) : Promise<number> {
        let ret = new Promise<number>((resolve, reject) => {
            this.logger_.debug(`Executing command: ${cmd.exe} ${cmd.args.join(' ')}`) ;

            // Here you would implement the logic to execute the command
            // For now, we just resolve with 0 to indicate success
            resolve(0) ;
        });
        return ret ;
    }

    public executeCommands(cmds: MTBCommand[]) : Promise<number[]> {    
        let ret = new Promise<number[]>((resolve, reject) => {
            let promises: Promise<number>[] = [] ;

            for(let cmd of cmds) {
                let pro = this.executeCommand(cmd) ;
                promises.push(pro) ;
            }

            Promise.all(promises)
                .then((res) => {
                    resolve(res) ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
        }) ;
        return ret ;
    }

    public generateSource(pass: string) : MTBCommand[] {
        let ret : MTBCommand[] = [] ;
        for(let tool of this.toolsDB.activeSet) {
            if (!tool.hasCodeGenerator) {
                continue ;
            }

            let cmds = this.runCodeGenerator(pass, tool);
            ret.push(...cmds);
        }
        return ret;
    }

    private runCodeGenerator(pass: string, tool: MTBTool) : MTBCommand[]{
        let cmds: MTBCommand[] = [] ;
        for(let pgm of tool.programs) {
            if (!pgm['code-gen']) {
                continue ;
            }

            for(let codegen of pgm['code-gen']) {
                if (codegen.passes.indexOf(pass) >= 0) {
                    let cmd = this.runSpecificCodeGenerator(tool, codegen) ;
                    cmds.push(cmd) ;
                }
            }
        }

        return cmds ;
    }

    private runSpecificCodeGenerator(tool: MTBTool, codegen: MTBOptProgramCodeGen) : MTBCommand {
        let exe = tool.path ;
        let argstr = codegen.args;
        let args = argstr.split(' ') ;
        return new MTBCommand(exe, args);
    }

    private nextStep() : Promise<void> | undefined {
        let ret : Promise<void> | undefined = undefined ;

        if (this.wants(MTBLoadFlags.AppInfo) && !this.has(MTBLoadFlags.AppInfo) && !this.loading(MTBLoadFlags.AppInfo)) {
            if (this.appdir_ === undefined) {
                ret = new Promise<void>((resolve, reject) => {
                    reject('AppInfo was requested via the load flags, but the appdir argument was not provided') ;
                }) ;
            }
            else {
                this.loading_ |= MTBLoadFlags.AppInfo ;
                ret = this.loadAppInfo() ;
            }
        }
        else if (this.wants(MTBLoadFlags.Tools) && !this.has(MTBLoadFlags.Tools) && !this.loading(MTBLoadFlags.Tools)) {
            this.loading_ |= MTBLoadFlags.Tools ;
            ret = this.loadTools() ;
        } 
        else if (this.wants(MTBLoadFlags.Manifest) && !this.has(MTBLoadFlags.Manifest) && !this.loading(MTBLoadFlags.Manifest)) {
            this.loading_ |= MTBLoadFlags.Manifest ;
            ret = this.loadManifest() ;
        } 
        else if (this.wants(MTBLoadFlags.DeviceDB) && !this.has(MTBLoadFlags.DeviceDB) && !this.loading(MTBLoadFlags.DeviceDB)) {
            this.loading_ |= MTBLoadFlags.DeviceDB ;
            ret = this.loadDeviceDB() ;
        } 

        return ret ;
    }

    private loadAppInfo() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.logger_.debug('Loading AppInfo') ;
            
            if (!this.tools_dir_) {
                this.setupToolsDir() ;
            }

            if (this.tools_dir_ === undefined) {
                let msg = `loadapp: no tools directory located` ;
                this.logger_.error(msg) ;
                reject(new Error(msg)) ;
            }
            else if (!this.appdir_) {
                let msg = `loadapp: trying to load an application with no application directory` ;
                this.logger_.error(msg) ;
                reject(new Error(msg)) ;                
            }
            else {
                this.app_info_ = new MTBAppInfo(this, this.appdir_) ;
                this.app_info_.load(this.logger_)
                    .then(()=> {
                        resolve() ;
                    })
                    .catch((err) => {
                        reject(err) ;
                    }) ;
            }

            resolve() ;
        }) ;
        return ret ;
    }

    private loadPacks() : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            this.logger_.debug('Loading Packs') ;
            try {
                let loader = new PackDBLoader(this.logger_, this.pack_db_!, this.tools_db_!) ;
                let dir = MTBUtils.allInfineonDeveloperCenterRegistryDir() ;
                if (dir !== undefined) {
                    try {
                        await loader.scanDirectory(dir) ;
                    }
                    catch(err) {
                        this.logger_.error( 'Error loading packs: ' + err) ;
                        reject(err) ;
                        return ;
                    }
                }

                dir = MTBUtils.userInfineonDeveloperCenterRegistryDir() ;
                if (dir !== undefined) {
                    try {
                        await loader.scanDirectory(dir) ;
                    }
                    catch(err) {
                        this.logger_.error( 'Error loading packs: ' + err) ;
                        reject(err) ;
                        return ;
                    }
                }
                resolve() ;
            }
            catch(err) {
                this.logger_.error( 'Error loading packs: ' + err) ;
                reject(err) ;
            }
        }) ;
        return ret ;
    }

    private loadTools() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (this.tools_dir_ === undefined) {
                //
                // If we loaded the application, the tools directory will be set.  If we are not
                // loading an application, we need to set the tools directory to the default location.
                // This is the location where the tools are installed.
                //
                this.setupToolsDir() ;
            }

            if (this.tools_dir_ === undefined) {
                this.logger_.error( 'Error loading tools: cannot locate a tools directory') ;
                reject(new Error('Error loading tools: cannot locate a tools directory')) ;
                return ;
            }

            this.logger_.debug('Loading Tools') ;
            this.tools_db_.addToolsDir({ dir: this.tools_dir_, source: MTBToolSource.ToolsDir}) ;
            for(let packdir of this.pack_db_.getTechPacks().map((pack) => pack.path())) {
                this.tools_db_.addToolsDir({ dir: packdir, source: MTBToolSource.TechPack }) ;
            }
            if (this.pack_db_.eap) {
                this.tools_db_.addToolsDir({ dir: this.pack_db_.eap.path(), source: MTBToolSource.Eap }) ;
            }
            this.tools_db_.scanAll(this.logger_)
                .then(() => {
                    this.tools_db_.setActiveToolSet(this.pack_db_.eap) ;
                    this.loading_ &= ~MTBLoadFlags.Tools ;
                    this.has_ |= MTBLoadFlags.Tools ;
                    resolve() ;
                })
                .catch((err) => {   
                    this.loading_ &= ~MTBLoadFlags.Tools ;
                    reject(err) ;
                }) ;
        });
        return ret ;
    }

    private searchToolsDir() : string | undefined {
        let ret = undefined ;

        if (this.exe_dir_) {

            let dir = this.exe_dir_ ;

            while (!MTBUtils.isRootPath(dir)) {
                if (dir.match(MTBUtils.toolsRegex1) || dir.match(MTBUtils.toolsRegex2)) {
                    ret = dir ;
                    break ;
                }

                dir = path.dirname(dir) ;
            }
        }

        return ret ;
    }

    private searchCommonDir() : string | undefined {
        let choices = [] ;
        let dir = MTBUtils.getCommonInstallLocation() ;
        if (dir !== undefined) {
            for(let one of fs.readdirSync(dir)) {
                let fullpath = path.join(dir, one) ;
                if (one.match(MTBUtils.toolsRegex1) || one.match(MTBUtils.toolsRegex2)) {
                    choices.push(fullpath) ;
                }
            }
        }

        let picked = undefined ;
        let curver: MTBVersion | undefined = undefined ;

        let prefix = 'tools_' ;
        for(let one of choices) {
            let vstr = path.basename(one) ;
            if (!vstr.startsWith(prefix)) {
                continue ;
            }
            let ver = MTBVersion.fromToolsVersionString(vstr) ;
            if (ver !== undefined) {
                if (curver === undefined || MTBVersion.compare(ver, curver) > 0) {
                    curver = ver ;
                    picked = one ;
                }
            }
        }

        return picked ;
    }

    private cyToolsPathDir() : string | undefined {
        let ret = undefined ;
        if (process.env.CY_TOOLS_PATHS) {
            let dirpaths = process.env.CY_TOOLS_PATHS.split(' ') ;
            for(let dirpath of dirpaths) {
                if (fs.existsSync(dirpath)) {
                    ret = path.normalize(dirpath) ;
                    break ;
                }
            }
        }
        return ret ;
    }

    private setupToolsDir() {
        let exeToolsDir = this.searchToolsDir() ;
        let toolspathDir = this.cyToolsPathDir() ;
        let commonDir = this.searchCommonDir() ;

        if (this.requested_tools_dir_ !== undefined) {
            this.tools_dir_ = this.requested_tools_dir_ ;
        }
        else if (exeToolsDir) {
            this.tools_dir_ = exeToolsDir ;
        }
        else if (toolspathDir) {
            this.tools_dir_ = toolspathDir ;
        }
        else if (commonDir) {
            this.tools_dir_ = commonDir ;
        }
    }

    private loadManifest() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.logger_.debug('Loading Manifest') ;
            this.manifest_db_.loadManifestData(this.logger_, [ModusToolboxEnvironment.mtbDefaultManifest, ...this.pack_db_.getManifestFiles()])
                .then(() => {
                    this.loading_ &= ~MTBLoadFlags.Manifest ;
                    this.has_ |= MTBLoadFlags.Manifest ;
                    resolve() ;
                })
                .catch((err) => {
                    this.loading_ &= ~MTBLoadFlags.Manifest ;
                    reject(err) ;
                }) ;
        }) ;
        return ret ;
    }

    private loadDeviceDB() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.logger_.debug('Loading DeviceDB') ;
            resolve() ;
        }) ;
        return ret ;
    }
}

