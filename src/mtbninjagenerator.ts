import * as vscode from 'vscode';
import * as path from 'path' ;
import * as fs from 'fs' ;
import { MTBAppInfo, getModusToolboxApp } from './mtbapp/mtbappinfo';
import { MTBProjectInfo } from './mtbapp/mtbprojinfo';

const builddir: string = "build" ;
const compilecmds : string = "compile_commands.json" ;
const ninjaname: string = "build.ninja" ;

class MTBOneCompile {
    private defines_ : string[] ;
    private file_ : string ;
    private dir_ : string ;

    public constructor(file: string, dir: string) {
        this.file_ = file ;
        this.dir_ = dir ;
        this.defines_ = [] ;
    }
}

export class MTB1NinjaGenerator {
    private app_ : MTBAppInfo ;
    private compiles_ : MTBOneCompile[] ;

    public constructor(app: MTBAppInfo) {
        this.app_ = app ;
        this.compiles_ = [] ;
    }

    private parseCompile(compile: MTBOneCompile, cmd: string) {
    }

    private createNinjaFromObject(ninjafile: string, obj: any) : boolean {
        let ret: boolean = false ;
        if (Array.isArray(obj)) {
            ret = true ;
            let elems : any[] = obj as any[] ;
            for(let elem of elems) {
                let compile = new MTBOneCompile(elem.file, elem.directory) ;
                this.compiles_.push(compile) ;
            }
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
