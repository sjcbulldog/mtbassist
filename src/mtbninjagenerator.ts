import * as vscode from 'vscode';
import * as path from 'path' ;
import * as fs from 'fs' ;
import * as exec from 'child_process' ;
import { MTBAppInfo } from './mtbapp/mtbappinfo';
import { MTBProjectInfo } from './mtbapp/mtbprojinfo';
import { MessageType, MTBExtensionInfo } from './mtbextinfo';
import { ModusToolboxEnvVarNames } from './mtbapp/mtbnames';

class MTBOneCompile {
    public defines_ : string[] ;
    public includes_ : string[] ;
    public flags_ : string[] ;
    public compiler_: string ;
    public uniqueDefines_ : string[] ;
    public uniqueIncludes_ : string[] ;
    public uniqueFlags_ : string[] ;
    public sourceFile_ : string ;
    public outFile_ : string ;

    public constructor() {
        this.defines_ = [] ;
        this.includes_ = [] ;
        this.flags_ = [] ;
        this.compiler_ = '' ;
        this.uniqueDefines_ = [] ;
        this.uniqueFlags_ = [] ;
        this.uniqueIncludes_ = [] ;
        this.sourceFile_ = '' ;
        this.outFile_ = '' ;
    }

    public addDefine(define: string) {
        this.defines_.push(define) ;
    }

    public addInclude(inc: string) {
        this.includes_.push(inc) ;
    }

    public addFlag(flag: string) {
        this.flags_.push(flag) ;
    }

    public addUniqueDefine(define: string) {
        this.uniqueDefines_.push(define) ;
    }

    public addUniqueInclude(include: string) {
        this.uniqueIncludes_.push(include) ;
    }

    public addUniqueFlag(flag: string) {
        this.uniqueFlags_.push(flag) ;
    }
}

 class MTBOneLink {
    public linker_: string ;
    public preflags_: string[] ;
    public postflags_: string[] ;
    public outfile_ : string ;

    public constructor() {
        this.linker_ = '' ;
        this.preflags_ = [] ;
        this.outfile_ = '' ;
        this.postflags_ = [] ;
    }
 }

export class MTBNinjaGenerator {

    static builddir: string = 'build' ;
    static compilecmds : string = 'compile_commands.json' ;
    static ninjaname: string = 'build.ninja' ;
    static baseflags: string = 'baseflags' ;
    static defineflags: string = 'defineflags' ;
    static incflags: string = 'incflags' ;

    private app_ : MTBAppInfo ;
    private compiles_ : MTBOneCompile[] ;
    private link_ : MTBOneLink ;
    private defines_ : string[] ;
    private includes_ : string[] ;
    private flags_ : string[] ;
    private cccompiler_: string = '' ;
    private cppcompiler_: string = '' ;
    private gccpath_ : string = '' ;

    public constructor(app: MTBAppInfo) {
        this.app_ = app ;
        this.compiles_ = [] ;
        this.defines_ = [] ;
        this.includes_ = [] ;
        this.flags_ = [] ;
        this.link_ = new MTBOneLink() ;
    }

    private splitCommand(cmd: string) : string[] {
        let ret: string[] = [] ;
        let index: number = 0 ;
        let word: string ;
        let match: string = '' ;

        while (index < cmd.length) {
            word = '' ;

            while (index < cmd.length && cmd[index] === ' ') {
                index++ ;
            }

            while (index < cmd.length) {
                if (match.length > 0 && cmd[index] !== match) {
                    word += cmd[index++] ;
                }
                else if (cmd[index] === match) {
                    word += cmd[index++] ;
                    match = '' ;
                }
                else if (cmd[index] === '\'' || cmd[index] === '"') {
                    word += cmd[index] ;
                    match = cmd[index++] ;
                }
                else if (cmd[index] === ' ') {
                    break ;
                }
                else {
                    word += cmd[index++] ;
                }
            }

            if (match.length > 0) {
                throw new Error('unterminated string in compile_commands.json file') ;
            }

            if (word.length > 0) {
                ret.push(word) ;
            }
        }

        return ret;
    }

    private parseLink(link: MTBOneLink, cmd: string) {
        let words: string[] = this.splitCommand(cmd) ;

        let before: boolean = true ;
        link.linker_ = words[0] ;
        for(let i = 1 ; i < words.length ; i++) {
            let word: string = words[i] ;
            if (word === '-o') {
                //
                // Grab the output file and skip this flag (TODO - check for bad cmd line with length)
                i++ ;
                link.outfile_ = words[i] ;
            }
            else if (word.startsWith('-')) {
                if (before) {
                    link.preflags_.push(word) ;
                }
                else {
                    link.postflags_.push(word) ;
                }
            }
            else if (word.startsWith('@')) {
                before = false ;
            }
        }
    }

    private readIncludes(compile: MTBOneCompile, filename: string) {
        let result = fs.readFileSync(filename).toString() ;
        if (result) {
            compile.includes_ = result.split(' ') ;
        }
    }

    private parseCompile(compile: MTBOneCompile, cmd: string) {
        let words: string[] = this.splitCommand(cmd) ;

        compile.compiler_ = words[0] ;
        for(let i = 1 ; i < words.length ; i++) {
            let word: string = words[i] ;
            if (word === '-c') {
                //
                // Skip this flag, it is part of the rules generation
                //
            }
            else if (word.startsWith('-o')) {
                //
                // Grab the output file and skip this flag (TODO - check for bad cmd line with length)
                i++ ;
                compile.outFile_ = words[i] ;
            }
            else if (word.startsWith('-D')) {
                compile.addDefine(word) ;
            }
            else if (word.startsWith('-I')) {
                compile.addInclude(word) ;
            }
            else if (word.startsWith('-')) {
                compile.addFlag(word) ;
            }
            else if (word.startsWith('@')) {
                //
                // This is the include list from make files
                //
                this.readIncludes(compile, word.substring(1)) ;
            }
            else {
                if (word.startsWith('mtb_shared')) {
                    word = '../' + word ;
                }
                compile.sourceFile_ = word ;
            }
        }
    }

    private findCommonDefines() {
        if (this.compiles_.length > 0) {
            for(let i = 0 ; i < this.compiles_[0].defines_.length ; i++) {
                let define: string = this.compiles_[0].defines_[i] ;
                let iscommon = true ;
                for(let j = 1 ; j < this.compiles_.length ; j++) {
                    if (this.compiles_[j].defines_.indexOf(define) === -1) {
                        iscommon = false ;
                        this.compiles_[j].addUniqueDefine(define) ;
                        break ;
                    }
                }

                if (iscommon) {
                    this.defines_.push(define) ;
                }
            }
        }
    }

    private findCommonIncludes() {
        if (this.compiles_.length > 0) {
            for(let i = 0 ; i < this.compiles_[0].includes_.length ; i++) {
                let include: string = this.compiles_[0].includes_[i] ;
                let iscommon = true ;
                for(let j = 1 ; j < this.compiles_.length ; j++) {
                    if (this.compiles_[j].includes_.indexOf(include) === -1) {
                        this.compiles_[j].addUniqueInclude(include) ;
                        iscommon = false ;
                        break ;
                    }
                }

                if (iscommon) {
                    this.includes_.push(include) ;
                }
            }
        }
    }

    private findCommonFlags() {
        if (this.compiles_.length > 0) {
            for(let i = 0 ; i < this.compiles_[0].flags_.length ; i++) {
                let flag: string = this.compiles_[0].flags_[i] ;
                let iscommon = true ;
                for(let j = 1 ; j < this.compiles_.length ; j++) {
                    if (this.compiles_[j].flags_.indexOf(flag) === -1) {
                        this.compiles_[j].addUniqueFlag(flag) ;                        
                        iscommon = false ;
                        break ;
                    }
                }

                if (iscommon) {
                    this.flags_.push(flag) ;
                }
            }
        }
    }
    
    private writeDefRespFile(out: fs.WriteStream) {
        out.write(MTBNinjaGenerator.defineflags + ' = ') ;
        for(let define of this.defines_) {
            out.write(' ' + define) ;
        }
        out.write('\n') ;    
    }

    private writeIncRespFile(out: fs.WriteStream) {
        out.write(MTBNinjaGenerator.incflags + ' = ' ) ;
        for(let include of this.includes_) {
            out.write(' ' + include) ;
        }
        out.write('\n') ;
    }

    private writeFlagsRespFile(out: fs.WriteStream) {
        out.write(MTBNinjaGenerator.baseflags + ' = ') ;
        for(let flag of this.flags_) {
            out.write(' ' + flag) ;
        }
        out.write('\n') ;
    }

    private writeCCRule(out: fs.WriteStream) {
        this.writeFlagsRespFile(out) ;
        this.writeDefRespFile(out) ;
        this.writeIncRespFile(out) ;
        out.write('cccontent = $' + MTBNinjaGenerator.baseflags + ' $' + MTBNinjaGenerator.defineflags + ' $' + MTBNinjaGenerator.incflags + '\n') ;

        out.write('rule cc\n') ;
        let compline = '    command = ' ;       
        compline += this.cccompiler_ ; ;
        compline += ' -MD -MF $out.d' ;
        compline += ' @$out.rsp' ;
        compline += ' -o $out' ;
        compline += ' -c $in' ;
        out.write(compline + '\n') ;
        out.write('    depfile = $out.d\n') ;
        out.write('    rspfile = $out.rsp\n');
        out.write('    rspfile_content = $cccontent\n') ;
        out.write('\n\n\n') ;
    }

    private writeCPPRule(out: fs.WriteStream) {
        this.writeFlagsRespFile(out) ;
        this.writeDefRespFile(out) ;
        this.writeIncRespFile(out) ;
        out.write('cccontent = $' + MTBNinjaGenerator.baseflags + ' $' + MTBNinjaGenerator.defineflags + ' $' + MTBNinjaGenerator.incflags + '\n') ;

        out.write('rule cpp\n') ;
        let compline = '    command = ' ;       
        compline += this.cppcompiler_ ; ;
        compline += ' -MD -MF $out.d' ;
        compline += ' @$out.rsp' ;
        compline += ' -o $out' ;
        compline += ' -c $in' ;
        out.write(compline + '\n') ;
        out.write('    depfile = $out.d\n') ;
        out.write('    rspfile = $out.rsp\n');
        out.write('    rspfile_content = $ccontent\n') ;
        out.write('\n\n\n') ;
    }    


    private writeLinkRule(builddir: string, out: fs.WriteStream) {
        out.write('objfiles = ') ;
        for(let compile of this.compiles_) {
            let outfile = path.relative(builddir, compile.outFile_).replace(/\\/g, '/') ;            
            out.write(' ' + outfile) ;
        }
        out.write('\n') ;

        out.write('rule link\n') ;
        let linkline = '    command = ' ;
        linkline += this.cppcompiler_  ;
        linkline += " -o " + this.link_.outfile_ ;
        for(let flag of this.link_.preflags_) {
            linkline += ' ' + flag ;
        }

        linkline += ' @$out.rsp' ;

        for(let flag of this.link_.postflags_) {
            linkline += ' ' + flag ;
        }

        out.write(linkline + '\n') ;
        out.write('    rspfile = $out.rsp\n') ;
        out.write('    rspfile_content = $objfiles\n') ;
        out.write('\n\n\n') ;
    }

    private writeHexRule(out: fs.WriteStream) {
        out.write('rule hex\n') ;
        out.write('    command = ') ;
        let objcopy = path.join(this.gccpath_, 'arm-none-eabi-objcopy').replace(/\\/g,'/') ;
        let hexfile = path.basename(this.link_.outfile_) + ".hex" ;
        out.write('    ' + objcopy + ' -O ihex $in $out\n') ;
        out.write('\n\n\n') ;
    }

    private writeNinjaFile(target: string, config: string, builddir: string, ninjafile: string) {
        this.findCommonDefines() ;
        this.findCommonIncludes() ;
        this.findCommonFlags() ;


        let out: fs.WriteStream = fs.createWriteStream(ninjafile) ;

        out.write('#\n') ;
        out.write('# Generated file, do not edit by hand\n') ;
        out.write('#\n\n');

        this.writeCCRule(out) ;
        this.writeCPPRule(out) ;
        this.writeLinkRule(builddir, out) ;
        this.writeHexRule(out) ;

        for(let compile of this.compiles_) {
            let outfile = path.relative(builddir, compile.outFile_).replace(/\\/g, '/') ;
            let compline = 'build ' + outfile + ': cc ' + compile.sourceFile_ ;
            out.write(compline + '\n') ;
        }

        let outfile = path.relative(builddir, this.link_.outfile_).replace(/\\/g, '/') ;
        out.write('build ' + outfile + ': link') ;
        for(let compile of this.compiles_) {
            let objfile = path.relative(builddir, compile.outFile_).replace(/\\/g, '/') ;
            out.write(' ' + objfile) ;
        }
        out.write('\n') ;

        let p: path.ParsedPath = path.parse(outfile) ;
        let hexfile = path.join(p.dir, p.name + ".hex").replace(/\\/g, '/');
        out.write('build ' + hexfile + ": hex " + outfile + "\n\n") ;

        vscode.window.showInformationMessage('Ninja file created') ;

        out.close() ;
    }

    private createNinjaFileInternal(target: string, config: string, builddir: string, ninjafile: string) {
        if (this.compiles_.length > 0) {
            let ccpath = path.dirname(this.compiles_[0].compiler_) ;
            this.cccompiler_ = path.join(ccpath, 'arm-none-eabi-gcc').replace(/\\/g, '/') + '.exe'; 
            this.cppcompiler_ = path.join(ccpath, 'arm-none-eabi-g++').replace(/\\/g, '/') + '.exe' ;
            this.writeNinjaFile(target, config, builddir, ninjafile) ;
        }
        else {
            vscode.window.showErrorMessage('no files found to commpile - invalid ModusToolbox project') ;
        }
    }

    private createNinjaFromObject(proj: MTBProjectInfo, builddir: string, ninjafile: string, obj: any) : boolean {
        let ret: boolean = false ;
        if (Array.isArray(obj)) {
            ret = true ;
            let elems : any[] = obj as any[] ;
            for(let elem of elems) {
                let compile = new MTBOneCompile() ;
                this.parseCompile(compile, elem.command) ;                
                this.compiles_.push(compile) ;
            }

            this.link_.outfile_ = path.join(builddir, proj.getVar(ModusToolboxEnvVarNames.MTB_TARGET)!, "Debug", proj.name + ".elf") ;
            this.link_.linker_ = path.join(MTBExtensionInfo.getMtbExtensionInfo().toolsDir, "gcc", "bin", "arm-none-eabi-g++") ;
            this.link_.preflags_ = ['-mcpu=cortex-m4', '--specs=nano.specs','-mfloat-abi=softfp','-mfpu=fpv4-sp-d16','-mthumb','-ffunction-sections',
                                    '-fdata-sections','-ffat-lto-objects','-g','-Wall','-pipe','-Wl,--gc-sections',
                                    '-T"bsps/TARGET_APP_CY8CPROTO-062-4343W/COMPONENT_CM4/TOOLCHAIN_GCC_ARM/linker.ld" -Wl,-Map,C:/fwk/projects/basic/build/APP_CY8CPROTO-062-4343W/Debug/basic-06.map'] ;
            this.link_.postflags_ = ['-Wl,--start-group','../mtb_shared/emusb-device/release-v1.2.0/USBD/COMPONENT_USBD_BASE/COMPONENT_CAT1A/CONFIG_Debug/COMPONENT_CM4/COMPONENT_SOFTFP/TOOLCHAIN_GCC_ARM/libusbd_base_d_cm4_gcc.a',
                                     'startup_psoc6_02_cm4.o','-Wl,--end-group'] ;

            this.createNinjaFileInternal(proj.getVar(ModusToolboxEnvVarNames.MTB_TARGET)!, 'Debug', builddir, ninjafile) ;
        }

        return ret ;
    }

    private mtbCreateNinjaFileForProjectCompileCommands(builddir: string, ninjafile: string, proj: MTBProjectInfo) {
        let compilefile = path.join(proj.getProjectDir(), MTBNinjaGenerator.builddir, MTBNinjaGenerator.compilecmds) ;

        let ret: boolean = false ;
        let result = fs.readFileSync(compilefile).toString() ;
        if (result) {
            let obj = JSON.parse(result.toString()) ;
            if (obj) {
                this.createNinjaFromObject(proj, builddir, ninjafile, obj) ;
            }
        }

        return ret ;    
    }

    private mtbRunDryrunBuild(context: vscode.ExtensionContext, cwd: string) : Promise<[number, string, string]> {
        let ret: Promise<[number, string, string]> = new Promise<[number, string, string]>((resolve, reject) => {
            let makepath : string = path.join(MTBExtensionInfo.getMtbExtensionInfo().toolsDir, "modus-shell", "bin", "bash") ;
            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "ModusToolbox: running 'make --dry-run --always-build build' in directory '" + cwd + "' ...") ;
            let cmd = "make --dry-run --always-make build" ;
            let job = exec.spawn(makepath, ["-c", 'PATH=/bin:/usr/bin ; ' + cmd], { cwd: cwd }) ;
            let output: string = '' ;
            let errmsg: string = '' ;
    
            job.stdout.on(('data'), (data: Buffer) => {
                output += data.toString() ;
            }) ;
    
            job.stderr.on(('data'), (data: string) => {
                errmsg += data.toString() ;
            }) ;
    
            job.on('close', (code: number) => {
                resolve([code, output, errmsg]) ;
            }) ;
        }) ;
    
        return ret ;
    }

    private mtbCreateNinjaFileFromMakeOutput(builddir: string, ninjafile: string, output: string, proj: MTBProjectInfo) {
        let lines: string[] = output.split('\n') ;


        for(let line of lines) {
            if (line.startsWith(this.gccpath_)) {
                if (line.indexOf(' -c ') !== -1) {
                    let compile = new MTBOneCompile() ;
                    this.parseCompile(compile, line) ;
                    this.compiles_.push(compile) ;                    
                }
                else if (line.indexOf('g++') !== -1) {
                    this.parseLink(this.link_, line) ;
                }
            }
        }

        this.createNinjaFileInternal(proj.getVar(ModusToolboxEnvVarNames.MTB_TARGET)!, "Debug", builddir, ninjafile) ;        
    }

    private mtbCreateNinjaFileForProjectMake(builddir: string, ninjafile: string, context: vscode.ExtensionContext, proj: MTBProjectInfo) {
        this.mtbRunDryrunBuild(context, proj.getProjectDir())
            .then(([code, output, errmsg]) => {
                if (code === 0) {
                    this.mtbCreateNinjaFileFromMakeOutput(builddir, ninjafile, output, proj) ;
                }
                else {
                    vscode.window.showErrorMessage("cannot create ninja file - 'make --dry-run --always-make build' failed - " + errmsg) ;
                }
            })
            .catch((err) => {
            }) ;
    }

    public mtbCreateNinjaBuildFile(context: vscode.ExtensionContext, method: number) {
        this.gccpath_ = path.join(MTBExtensionInfo.getMtbExtensionInfo().toolsDir, "gcc", "bin").replace(/\\/g,'/') ;
        for(var proj of this.app_.projects) {

            let bdir: string = path.join(proj.getProjectDir(), MTBNinjaGenerator.builddir) ;
            
            let outdir: string = path.join(bdir, proj.getVar(ModusToolboxEnvVarNames.MTB_TARGET)!, 'Debug') ;
            if (!fs.existsSync(outdir)) {
                fs.mkdirSync(outdir, { recursive : true}) ;
            }

            let ninjafile = path.join(proj.getProjectDir(), MTBNinjaGenerator.builddir, MTBNinjaGenerator.ninjaname) ;  
            if (method === 0) {
                this.mtbCreateNinjaFileForProjectCompileCommands(proj.getProjectDir(), ninjafile, proj) ;
            }
            else {
                this.mtbCreateNinjaFileForProjectMake(proj.getProjectDir(), ninjafile, context, proj) ;
            }
        }
    }
}
