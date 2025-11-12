///
// Copyright 2023 by C And T Software
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// 	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
import * as fs from 'fs' ;
import * as path from "path" ;
import * as winston from 'winston';
import { MTBAppInfo } from '../mtbenv/appdata/mtbappinfo';
import { MTBProjectInfo } from '../mtbenv/appdata/mtbprojinfo';
import { MTBAssetInstance } from '../mtbenv/appdata/mtbassetinst';
import { MTBAssetRequest } from '../mtbenv/appdata/mtbassetreq';

//
// This file loads the and maintains the information about the current ModusToolbox
// application.
//
// A new application is loaded by calling mtbAssistLoadApp(appDir) where appDir is
// the directory that contains the ModusToolbox application.  Once this API is called
// the application can be accessed via the global theModusToolboxApp.  The load happens
// in the background and the load may fail, so it is important to check the isLoading
// member to see if the loading processes is underway.  If the load fails or has never
// happened, the isValid member will be false.
//

class MtbFunDocEntry
{
    public readonly symbol_ : string ;
    public readonly url_ : string ;

    public constructor(symbol: string, url: string) {
        this.symbol_ = symbol ;
        this.url_ = url ;
    }
}

export class MtbFunIndex
{  
    private static readonly whchars: string[] = [ ' ', '\t', '\n', '\r'] ;

    private fmap: Map<string, MtbFunDocEntry> ;
    private processed: string[] ;
    private appdir: string ;
    private logger_ : winston.Logger ;
    private keywordCount_ : number = 0 ;

    public constructor(logger: winston.Logger) {
        this.fmap = new Map<string, MtbFunDocEntry>() ;
        this.processed = [] ;
        this.appdir = "" ;
        this.logger_ = logger ;
    }

    public symbols() : IterableIterator<string> {
        return this.fmap.keys() ;
    }

    public get keywordCount() : number {
        return this.keywordCount_ ;
    }

    public async init(app: MTBAppInfo) {
        let ret : Promise<void>[] = [] ;

        this.appdir = app.appdir ;
        this.keywordCount_ = 0 ;

        for(let proj of app.projects) {
            try {
                this.keywordCount_ +=await this.initProject(proj) ;
            }
            catch(err) {
                this.logger_.error("Error processing project '" + proj.name + "' for symbols : " + err) ;
            }
        }

        this.logger_.info("Indexed " + this.keywordCount_ + " symbols for application in '" + this.appdir + "'") ;
    }

    public contains(symbol: string) {
        return this.fmap.has(symbol) ;
    }

    public getUrl(symbol: string) : string | undefined {
        let entry : MtbFunDocEntry | undefined = this.fmap.get(symbol) ;
        if (!entry) {
            return undefined ;
        }

        return entry.url_ ;
    }

    private async initProject(proj: MTBProjectInfo) : Promise<number> {
        let ret: Promise<number> = new Promise<number>(async (resolve, reject) => {
            let count = 0 ;

            this.logger_.debug("Looking in project '" + proj.name + "' for symbols") ;

            let p : Promise<number>[] = [] ;
            for(let asset of proj.assetsRequests) {
                let loc = asset.fullPath(proj.dirList) ;
                if (loc && this.processed.indexOf(loc) === -1) {
                    p = p.concat(this.initAsset(proj, asset)) ;
                }
            }

            this.logger_.debug("    processing " + p.length + " assets in project '" + proj.name + "' for symbols") ;
            Promise.all(p)
            .then((values) => {
                for(let v of values) {
                    count += v ;
                }
                this.logger_.debug("    found " + count + " symbols in project '" + proj.name + "'") ;
                resolve(count) ;
            })
            .catch((err) => {
                this.logger_.error("Error processing project '" + proj.name + "' for symbols : " + err) ;
                reject(err) ;
            });
        }) ;
        return ret ;
    }
    
    //
    // Find all
    //
    private findFilesByName(name: string, path: string) {
        let ret: string[] = [] ;
        this.findFilesByNameInt(name, path, ret) ;
        return ret;
    }

    private findFilesByNameInt(name: string, p: string, dirs: string[]) {
        let entries: string[] ;

        try {
            entries = fs.readdirSync(p) ;
        }
        catch(err) {
            return ;
        }        

        for(let entry of entries) {
            let fullentry = path.join(p, entry) ;
            try {
                let st = fs.statSync(fullentry) ;
                if (st.isFile()) {
                    if (entry === name) {
                        dirs.push(p) ;
                    }
                }
                else if (st.isDirectory()) {
                    let fullpath: string = path.join(p, entry) ;
                    this.findFilesByNameInt(name, fullpath, dirs) ;
                }
            }
            catch(err) {
                //
                // If there are things in an asset we cannot search, we just ignore them
                //
            }
        }
    }

    private findFilesByExt(p: string, ext: string, result: string[]) {
        let entries: string[] ;
        
        try {
            entries = fs.readdirSync(p) ;
        }
        catch(err) {
            return ;
        }

        let fullext = "." + ext ;
        for(let entry of entries) {
            let fullentry = path.join(p, entry) ;
            let st = fs.statSync(fullentry) ;
            if (st.isFile()) {
                if (fullentry.endsWith(fullext)) {
                    result.push(fullentry) ;
                }
            }
            else if (st.isDirectory()) {
                this.findFilesByExt(fullentry, ext, result) ;
            }
        }
    }

    private skipSpaces(toparse: string, index: number) : number {
        while (MtbFunIndex.whchars.indexOf(toparse[index]) !== -1) {
            index++ ;
        }

        return index ;
    }

    private parseLiteral(toparse: string, index: number, literal: string) : [number, boolean] {
        index = this.skipSpaces(toparse, index) ;
        if (toparse.substring(index, index + literal.length) === literal) {
            return [index + literal.length, true] ;
        }

        return [index, false] ;
    }

    private readonly reg: RegExp = /[a-zA-Z0-9_$]+/ ;
    private parseIdentifier(toparse: string, index: number) : [number, boolean, string | undefined] {
        index = this.skipSpaces(toparse, index) ;
        let result = this.reg.exec(toparse.substring(index)) ;
        if (!result) {
            return [index, false, undefined] ;
        }

        return [index + result[0].length, true, result[0]] ;
    }

    private parseVarAssign(toparse: string, index: number) : [number, boolean, string | undefined] {

        let status: boolean = false ;
        let id: string | undefined = '' ;

        [index, status] = this.parseLiteral(toparse, index, "var") ;
        if (status === false) {
            return [index, false, undefined] ;
        }

        [index, status, id] = this.parseIdentifier(toparse, index) ;
        if (status === false) {
            return [index, false, undefined] ;
        }

        [index, status] = this.parseLiteral(toparse, index, "=") ;
        if (status === false) {
            return [index, false, undefined] ;
        }

        return [index, true, id] ;
    }

    private processSearchData(dir: string, obj: Object) : number {
        let count: number = 0 ;

        if (Array.isArray(obj)) {
            try {
                let entries = obj as [] ;
                for(let e of entries) {
                    if (Array.isArray(e[1])) {
                        let data : any[] = e[1] as any[] ;
                        let symbol: string = data[0] as string ;
                        let otherdata: any[] = data[1] as any[] ;
                        let url : string = otherdata[0] as string ;

                        if (url.indexOf('#') !== -1) {
                            url = path.join(dir, url) ;
                            let mapentry : MtbFunDocEntry = new MtbFunDocEntry(symbol, url) ;
                            this.fmap.set(symbol, mapentry) ;
                            count++ ;
                        }
                    }
                }
            }
            catch(err) {
            }
        }
        return count ;
    }

    private processArbitrarySymbol(dir: string, obj: Object) : number {
        let count: number = 0 ;

        if (Array.isArray(obj)) {
            let entries = obj as [] ;
            for(let e of entries) {
                let entry : any[] = (e as any) ;
                if (entry.length === 3) {
                    if (entry[2] === null) {
                        let url: string = path.join(dir, entry[1]) ;
                        let mapentry : MtbFunDocEntry = new MtbFunDocEntry(entry[0], url) ;
                        this.fmap.set(entry[0], mapentry) ;
                        count++ ;
                    }
                }
            }
        }

        return count ;
    }

    private processJSFile(p: string) : Promise<number> {
        let ret = new Promise<number>((resolve, reject) => {
            this.logger_.debug("        processing JS file '" + p + "' for symbols") ;
            let dir = path.dirname(p) ;
            let index: number = 0 ;
            let count: number = 0 ;
            let ext = fs.readFileSync(p).toString() ;
            let status: boolean = false ;
            let obj = [] ;
            let id: string | undefined;

            [index, status, id] = this.parseVarAssign(ext, index) ;
            if (status === false) {
                return 0 ;
            }

            let toparse = '' ;
            try {
                let regex: RegExp = /'/g ;
                let toparse = ext.substring(index, ext.length) ;
                while (MtbFunIndex.whchars.indexOf(toparse[toparse.length - 1]) !== -1) {
                    toparse = toparse.substring(0, toparse.length - 1) ;
                }

                while (toparse[toparse.length -1] === ';') {
                    toparse = toparse.substring(0, toparse.length - 1) ;                
                }

                toparse = toparse.replace(regex, '"') ;
                obj = JSON.parse(toparse) ;
            }
            catch(err) {
                return 0 ;
            }

            if (id === 'searchData') {
                count += this.processSearchData(dir, obj) ;
            }
            else if (id === 'modules') {
            }
            else {
                count += this.processArbitrarySymbol(dir, obj) ;
            }
            resolve(count) ;
        }) ;
        return ret ;
    }

    private initAsset(proj: MTBProjectInfo, asset: MTBAssetRequest) : Promise<number>[] {
        let parray : Promise<number>[] = [] ;
        this.logger_.silly("    looking in asset '" + asset.name() + "' for symbols") ;
        let count = 0 ;
        let loc = asset.fullPath(proj.dirList) ;
        if (loc && fs.existsSync(loc)) {
            let dirs: string[] = this.findFilesByName('api_reference_manual.html', loc) ;
            let files: string[] = [] ;

            for(let dir of dirs) {
                this.findFilesByExt(dir, "js", files) ;
            }

            for(let file of files) {
                parray.push(this.processJSFile(file)) ;
            }
        } 
        return parray ;
    }
}