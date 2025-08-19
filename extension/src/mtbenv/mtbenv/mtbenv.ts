import { MTBLoadFlags } from './loadflags' ;
import { MTBManifestDB } from '../manifest/mtbmanifestdb';
import { PackDB, PackManifest } from '../packdb/packdb';
import { PackDBLoader } from '../packdb/packdbloader';
import { MTBToolSource, ToolsDB } from '../toolsdb/toolsdb';
import { MTBUtils } from '../misc/mtbutils';
import { MTBVersion } from '../misc/mtbversion';
import { MTBAppInfo } from '../appdata/mtbappinfo';
import { MTBOptProgramCodeGen, MTBTool } from '../toolsdb/mtbtool';
import { MTBCommand } from './mtbcmd';
import * as winston from 'winston';
import * as EventEmitter from 'events';
import * as exec from 'child_process' ;
import * as path from 'path';
import * as fs from 'fs';
import { URI } from 'vscode-uri';

export class ModusToolboxEnvironment extends EventEmitter {
    // Static variables
    private static env_? : ModusToolboxEnvironment ;
    static mtbDefaultManifest: string = "https://modustoolbox.infineon.com/manifests/mtb-super-manifest/v2.X/mtb-super-manifest-fv2.xml";

    // Instance variables
    private isLoading_: boolean = false ;
    private appdir_? : string ;
    private wants_ : MTBLoadFlags = MTBLoadFlags.none ;
    private has_ : MTBLoadFlags = MTBLoadFlags.none ;
    private loading_ : MTBLoadFlags = MTBLoadFlags.none ;

    private manifestDb_ : MTBManifestDB ;
    private toolsDb_ : ToolsDB ;
    private packDb_ : PackDB ;
    private appInfo_? : MTBAppInfo ;

    private requestedToolsDir_? : string ;
    private exeDir_? : string ;
    private toolsDir_? : string ;

    private logger_ : winston.Logger ;  

    public static getInstance(logger: winston.Logger, exedir?: string) : ModusToolboxEnvironment | null {
        if (!ModusToolboxEnvironment.env_) {
            ModusToolboxEnvironment.env_ = new ModusToolboxEnvironment(logger, exedir) ;
        }
        else {
            if (exedir && exedir !== ModusToolboxEnvironment.env_.exeDir_) {
                logger.error('ModusToolboxEnvironment already created with a different executable directory') ;
                logger.error(`    Current: ${ModusToolboxEnvironment.env_.exeDir_}, New: ${exedir}`) ;
                return null ;
            }

            if (ModusToolboxEnvironment.env_.logger_ !== logger) {
                ModusToolboxEnvironment.env_.logger_ = logger ;
            }
        }

        return ModusToolboxEnvironment.env_ ;
    }

    private constructor(logger: winston.Logger, exedir?: string) {
        super() ;
        this.logger_ = logger ; 
        this.toolsDb_ = new ToolsDB() ;
        this.packDb_ = new PackDB() ;
        this.manifestDb_ = new MTBManifestDB() ;

        this.exeDir_ = exedir ;
        if (this.exeDir_) {
            this.exeDir_ = path.normalize(this.exeDir_) ;
        }
        this.logger_ = logger ;
    }

    public destroy() {
        ModusToolboxEnvironment.env_ = undefined ;
    }

    public get bspName() : string | undefined {
        let ret: string | undefined = undefined ;
        for(let p of this.appInfo?.projects || []) {
            if (!ret && p.bspName) {
                ret = p.bspName ;
            }
            else if (ret && p.bspName !== ret) {
                return undefined ;
            }
        }
        return ret ;
    }

    public get manifestDB() : MTBManifestDB {
        return this.manifestDb_ ;
    }

    public get toolsDB() : ToolsDB {
        return this.toolsDb_ ;
    }

    public get packDB() : PackDB {
        return this.packDb_ ;
    }

    public get appInfo() : MTBAppInfo | undefined {
        return this.appInfo_ ;
    }

    public setRequestedToolsDir(dir: string) {
        this.requestedToolsDir_ = dir ;
    }

    public get toolsDir() : string | undefined {
        return this.toolsDir_ ;
    }

    public get defaultToolsDir() : string | undefined {
        return this.setupToolsDir() ;
    }

    public get isLoading() : boolean {
        return this.isLoading_ ; 
    }

    public reloadAppInfo() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (this.appdir_ === undefined) {
                reject('AppInfo was requested via the load flags, but the appdir argument was not provided') ;
            }
            else {
                this.loading_ |= MTBLoadFlags.appInfo ;
                this.loadAppInfo()
                .then(() => {
                    this.isLoading_ = false ;
                    this.has_ |= MTBLoadFlags.appInfo ;
                    this.emit('loaded', this.has_) ;
                    resolve() ;
                })
                .catch((err) => {
                    this.isLoading_ = false ;
                    this.has_ &= ~MTBLoadFlags.appInfo ;
                    this.wants_ &= ~MTBLoadFlags.appInfo ;
                    this.logger_.error('Error reloading AppInfo:', err) ;
                    this.emit('error', err) ;
                    reject(err) ;
                }) ;
            }            
        }) ;

        return ret ;
    }

    public load(flags: MTBLoadFlags, appdir?: string) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (this.isLoading_) {
                reject('ModusToolboxEnvironment is already loading') ;
                return ;
            }

            this.isLoading_ = true ;
            if (appdir !== undefined) {
                this.appdir_ = appdir ;
            }
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
                            this.isLoading_ = false ;
                            this.has_ = this.has_ | this.wants_ ;
                            this.wants_ = MTBLoadFlags.none ;
                            this.emit('loaded', this.has_) ;
                            resolve() ;
                        })
                        .catch((err) => {
                            this.isLoading_ = false ;
                            this.has_ = MTBLoadFlags.none ;
                            this.wants_ = MTBLoadFlags.none ;                            
                            this.logger_.error('Error loading ModusToolbox environment:', err) ;
                            this.emit('error', err) ;

                            reject(err) ;
                        }) ;
                })
                .catch((err) => {
                    this.emit('error', err) ;
                    this.isLoading_ = false ;
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

    public static async runCmdCaptureOutput(cwd: string, cmd: string, args: string[], cb?: (lines: string[], id?: any) => void, id?: any) : Promise<[number, string[]]> {
        let ret: Promise<[number, string[]]> = new Promise<[number, string[]]>((resolve, reject) => {
            let sofar = 0 ;
            let text: string = "" ;
            let penv : any = {} ;
            let found = false ;
            for(let key in process.env) {
                if (key === 'PATH') {
                    penv['PATH'] = ModusToolboxEnvironment.filterPath(process.env[key]!) ;
                    found = true ;
                }
                else {
                    penv[key] = process.env[key] ;
                }
            }

            if (!found) {
                penv['PATH'] = ModusToolboxEnvironment.filterPath('') ;
            }

            let cp: exec.ChildProcess = exec.spawn(cmd, args, 
                {
                    cwd: cwd,
                    env: penv,
                    windowsHide: true,
                }) ;

            cp.stdout?.on('data', (data) => {
                text += (data as Buffer).toString() ;
                if (cb) {
                    sofar = this.sendTextToCallback(text, sofar, cb, id) ;
                }
            }) ;
            cp.stderr?.on('data', (data) => {
                text += (data as Buffer).toString() ;      
                if (cb) {
                    sofar = this.sendTextToCallback(text, sofar, cb, id) ;
                }
            }) ;
            cp.on('error', (err) => {
                reject(err);
            }) ;
            cp.on('close', (code) => {
                if (!code) {
                    code = 0 ;
                }

                let ret: string[] = text.split('\n') ;
                resolve([code, ret]);
            });
        }) ;

        return ret;
    }    

    private static sendTextToCallback(text: string, sofar: number, cb: (lines: string[], id: any) => void, id: any) : number {
        let lines = text.split('\n') ;
        if (lines.length > sofar + 1) {
            // If we have more than one line, we need to send the lines to the callback
            let newlines = lines.slice(sofar, lines.length - 2) ;
            cb(newlines, id) ;
            sofar += newlines.length ;
        }

        // Return the number of lines sent
        return sofar ;
    }

    private static filterPath(path: string) : string {
        let paths = path.split(';') ;
        let elems = paths.filter((p) => { return p.indexOf('cygwin') < 0 ; }) ;
        elems.push('/usr/bin') ;    // Ensure /usr/bin is always included
        elems.push('/bin') ;        // Ensure /bin is always included
        elems.push('C:/windows/System32') ;
        return elems.join(';') ;
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

        if (this.wants(MTBLoadFlags.appInfo) && !this.has(MTBLoadFlags.appInfo) && !this.loading(MTBLoadFlags.appInfo)) {
            if (this.appdir_ === undefined) {
                ret = new Promise<void>((resolve, reject) => {
                    reject('AppInfo was requested via the load flags, but the appdir argument was not provided') ;
                }) ;
            }
            else {
                this.loading_ |= MTBLoadFlags.appInfo ;
                ret = this.loadAppInfo() ;
            }
        }
        else if (this.wants(MTBLoadFlags.tools) && !this.has(MTBLoadFlags.tools) && !this.loading(MTBLoadFlags.tools)) {
            this.loading_ |= MTBLoadFlags.tools ;
            ret = this.loadTools() ;
        } 
        else if (this.wants(MTBLoadFlags.manifestData) && !this.has(MTBLoadFlags.manifestData) && !this.loading(MTBLoadFlags.manifestData)) {
            this.loading_ |= MTBLoadFlags.manifestData ;
            ret = this.loadManifest() ;
        } 
        else if (this.wants(MTBLoadFlags.deviceDB) && !this.has(MTBLoadFlags.deviceDB) && !this.loading(MTBLoadFlags.deviceDB)) {
            this.loading_ |= MTBLoadFlags.deviceDB ;
            ret = this.loadDeviceDB() ;
        } 

        return ret ;
    }

    private async loadAppInfo() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.logger_.debug('Loading AppInfo') ;
            
            if (!this.toolsDir_) {
                this.toolsDir_ = this.setupToolsDir() ;
            }

            if (this.toolsDir_ === undefined) {
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
                this.appInfo_ = new MTBAppInfo(this, this.appdir_) ;
                this.appInfo_.load(this.logger_)
                    .then(()=> {
                        resolve() ;
                    })
                    .catch((err) => {
                        reject(err) ;
                    }) ;
            }
        }) ;
        return ret ;
    }

    private loadPacks() : Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            this.logger_.debug('Loading Packs') ;
            try {
                let loader = new PackDBLoader(this.logger_, this.packDb_!, this.toolsDb_!) ;
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
                this.logger_.debug('Loading Packs complete') ;
                if (this.packDB.isEarlyAccessPackActive) {
                    this.logger_.debug('Early Access Pack is active') ;
                    this.manifestDB.eapPath = this.packDB.eap?.path() ;
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
            if (this.toolsDir_ === undefined) {
                //
                // If we loaded the application, the tools directory will be set.  If we are not
                // loading an application, we need to set the tools directory to the default location.
                // This is the location where the tools are installed.
                //
                this.toolsDir_ = this.setupToolsDir() ;
            }

            if (this.toolsDir_ === undefined) {
                this.logger_.error( 'Error loading tools: cannot locate a tools directory') ;
                reject(new Error('Error loading tools: cannot locate a tools directory')) ;
                return ;
            }

            this.logger_.debug('Loading Tools') ;
            this.toolsDb_.addToolsDir({ dir: this.toolsDir_, source: MTBToolSource.ToolsDir}) ;
            for(let packdir of this.packDb_.getTechPacks().map((pack) => pack.path())) {
                this.toolsDb_.addToolsDir({ dir: packdir, source: MTBToolSource.TechPack }) ;
            }
            if (this.packDb_.eap) {
                this.toolsDb_.addToolsDir({ dir: this.packDb_.eap.path(), source: MTBToolSource.Eap }) ;
            }
            this.toolsDb_.scanAll(this.logger_)
                .then(() => {
                    this.toolsDb_.setActiveToolSet(this.packDb_.eap) ;
                    this.loading_ &= ~MTBLoadFlags.tools ;
                    this.has_ |= MTBLoadFlags.tools ;
                    this.logger_.debug('Loading Tools complete') ;
                    resolve() ;
                })
                .catch((err) => {   
                    this.loading_ &= ~MTBLoadFlags.tools ;
                    reject(err) ;
                }) ;
        });
        return ret ;
    }

    private searchToolsDir() : string | undefined {
        let ret = undefined ;

        if (this.exeDir_) {

            let dir = this.exeDir_ ;

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

    private setupToolsDir() : string | undefined {
        let ret : string | undefined = undefined ;

        let exeToolsDir = this.searchToolsDir() ;
        let toolspathDir = this.cyToolsPathDir() ;
        let commonDir = this.searchCommonDir() ;

        if (this.requestedToolsDir_ !== undefined) {
            ret = this.requestedToolsDir_ ;
        }
        else if (exeToolsDir) {
            ret = exeToolsDir ;
        }
        else if (toolspathDir) {
            ret = toolspathDir ;
        }
        else if (commonDir) {
            ret = commonDir ;
        }

        return ret ;
    }

    private loadManifest() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.logger_.debug('Loading Manifest') ;
            let defman : PackManifest = { 
                uripath: URI.parse(ModusToolboxEnvironment.mtbDefaultManifest),
                iseap: false 
            } ;
            this.manifestDb_.loadManifestData(this.logger_, [defman, ...this.packDb_.getManifestFiles()])
                .then(() => {
                    this.loading_ &= ~MTBLoadFlags.manifestData ;
                    this.has_ |= MTBLoadFlags.manifestData ;
                    resolve() ;
                })
                .catch((err) => {
                    this.loading_ &= ~MTBLoadFlags.manifestData ;
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

