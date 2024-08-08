import * as vscode from 'vscode';
import * as path from 'path' ;
import * as fs from 'fs' ;
import { MTBAppInfo, getModusToolboxApp } from './mtbapp/mtbappinfo';
import { MTBProjectInfo } from './mtbapp/mtbprojinfo';
import { Console } from 'console';

const builddir: string = "build" ;
const compilecmds : string = "compile_commands.json" ;
const ninjaname: string = "build.ninja" ;

class MTBOneCompile {
    public defines_ : string[] ;
    public includes_ : string[] ;
    public flags_ : string[] ;
    public file_ : string ;
    public dir_ : string ;
    public compiler_: string ;
    public uniqueDefines_ : string[] ;
    public uniqueIncludes_ : string[] ;
    public uniqueFlags_ : string[] ;
    public sourceFile_ : string ;
    public outFile_ : string ;

    public constructor(file: string, dir: string) {
        this.file_ = file ;
        this.dir_ = dir ;
        this.defines_ = [] ;
        this.includes_ = [] ;
        this.flags_ = [] ;
        this.compiler_ = "" ;
        this.uniqueDefines_ = [] ;
        this.uniqueFlags_ = [] ;
        this.uniqueIncludes_ = [] ;
        this.sourceFile_ = "" ;
        this.outFile_ = "" ;
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

export class MTB1NinjaGenerator {
    private app_ : MTBAppInfo ;
    private compiles_ : MTBOneCompile[] ;
    private defines_ : string[] ;
    private includes_ : string[] ;
    private flags_ : string[] ;

    public constructor(app: MTBAppInfo) {
        this.app_ = app ;
        this.compiles_ = [] ;
        this.defines_ = [] ;
        this.includes_ = [] ;
        this.flags_ = [] ;
    }

    private splitCommand(cmd: string) : string[] {
        let ret: string[] = [] ;
        let index: number = 0 ;
        let word: string ;
        let match: string = "" ;

        while (index < cmd.length) {
            word = "" ;

            while (index < cmd.length && cmd[index] === ' ') {
                index++ ;
            }

            while (index < cmd.length) {
                if (match.length > 0 && cmd[index] !== match) {
                    word += cmd[index++] ;
                }
                else if (cmd[index] === match) {
                    word += cmd[index++] ;
                    match = "" ;
                }
                else if (cmd[index] === "'" || cmd[index] === '"') {
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
                throw new Error("unterminated string in compile_commands.json file") ;
            }

            if (word.length > 0) {
                ret.push(word) ;
            }
        }

        return ret;
    }

    private parseCompile(compile: MTBOneCompile, cmd: string) {
        let words: string[] = this.splitCommand(cmd) ;

        compile.compiler_ = words[0] ;
        for(let i = 1 ; i < words.length ; i++) {
            let word: string = words[i] ;
            if (word === "-c") {
                //
                // Skip this flag, it is part of the rules generation
                //
            }
            else if (word.startsWith("-o")) {
                //
                // Grab the output file and skip this flag (TODO - check for bad cmd line with length)
                i++ ;
                compile.outFile_ = words[i] ;
            }
            else if (word.startsWith("-D")) {
                compile.addDefine(word) ;
            }
            else if (word.startsWith("-I")) {
                compile.addInclude(word) ;
            }
            else if (word.startsWith("-")) {
                compile.addFlag(word) ;
            }
            else {
                if (word.startsWith("mtb_shared")) {
                    word = "../" + word ;
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

    private writeNinjaFile(ninjaFile: string) {
        let out: fs.WriteStream = fs.createWriteStream(ninjaFile) ;
        out.write('#\n') ;
        out.write('# Generated file, do not edit by hand\n')
        out.write('#\n\n');

        out.write('cflags =') ;
        for(let flag of this.flags_) {
            out.write(' ' + flag) ;
        }
        out.write('\n') ;

        out.write('\ncdefines=') ;
        for(let define of this.defines_) {
            out.write(' ' + define) ;
        }
        out.write('\n') ;       
        
        out.write('\ncincludes=') ;
        for(let include of this.includes_) {
            out.write(' ' + include) ;
        }
        out.write('\n\n') ;

        out.write('rule cc\n') ;

        let compline = "    command = " ;
        
        compline += this.compiles_[0].compiler_ ;
        compline += " $cflags" ;
        compline += " $cdefines" ;
        compline += " $cincludes" ;
        compline += " -o $out" ;
        compline += " -c $in" ;
        out.write(compline + "\n\n\n") ;

        for(let compile of this.compiles_) {
            compline = "build " + compile.outFile_ + ": cc " + compile.sourceFile_ ;
            out.write(compline + "\n") ;
        }
    }

    private createNinjaFromObject(ninjafile: string, obj: any) : boolean {
        let ret: boolean = false ;
        if (Array.isArray(obj)) {
            ret = true ;
            let elems : any[] = obj as any[] ;
            for(let elem of elems) {
                let compile = new MTBOneCompile(elem.file, elem.directory) ;
                this.compiles_.push(compile) ;
                this.parseCompile(compile, elem.command) ;
            }

            this.findCommonDefines() ;
            this.findCommonIncludes() ;
            this.findCommonFlags() ;

            this.writeNinjaFile(ninjafile) ;
        }

        return ret ;
    }

    private mtbCreateNinjaFileForProject(proj: MTBProjectInfo) {
        let compilefile = path.join(proj.getProjectDir(), builddir, compilecmds) ;
        let ninjafile = path.join(proj.getProjectDir(), builddir, ninjaname) ;
        let ret: boolean = false ;
        let result = fs.readFileSync(compilefile).toString() ;
        if (result) {
            let obj = JSON.parse(result.toString()) ;
            if (obj) {
                this.createNinjaFromObject(ninjafile, obj) ;
            }
        }

        return ret ;    
    }

    public mtbCreateNinjaBuildFile(context: vscode.ExtensionContext) {
        for(var proj of this.app_.projects) {
            this.mtbCreateNinjaFileForProject(proj) ;
        }
    }
}
