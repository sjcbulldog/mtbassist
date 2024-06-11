import { ModusToolboxEnvVarNames } from "./mtbapp/mtbnames";
import { runMtbQuery } from "./mtbapp/mtbrunprogs";
import { MTBLaunchDoc } from "./mtblaunchdata";
import * as fs from 'fs' ;
import * as path from 'path' ;

const mtbPacksToken = "ModusToolbox Packs" ;
const mtbSeperatorToken = "========" ;
const mtbIdKeyword = "id:" ;
const mtbGuidKeyword = "guid:" ;
const mtbPathKeyword = "path:" ;
const mtbVersionKeyword = "version:" ;
const mtbVersionNumberKeyword = "versionNumber:" ;

export class MTBPack {
    public title: string ;
    public id: string | undefined ;
    public path: string | undefined ;
    public guid: string | undefined ;
    public version: string | undefined ;
    public versionNumber: string | undefined ;

    public constructor(title: string) {
        this.title = title ;
    }

    private findPDFs(dir: string) : string[] {
        let ret: string[] = [] ;
        this.findPDFsInDir(dir, ret) ;
        return ret ;
    }

    private findPDFsInDir(dir: string, results: string[]) {
        let files = fs.readdirSync(dir) ;
        for(let file of files) {
            let full: string = path.join(dir, file) ;
            if (fs.statSync(full).isDirectory()) {
                this.findPDFsInDir(full, results) ;
            }
            else if (file.endsWith(".pdf")) {
                results.push(full) ;
            }
        }
    }

    public getDocs() : MTBLaunchDoc[] {
        let ret: MTBLaunchDoc[] = [] ;
        if (this.path) {
            let pdfs: string[] = this.findPDFs(this.path) ;
            for(let pdf of pdfs) {
                let doc: MTBLaunchDoc = new MTBLaunchDoc() ;
                doc.location = pdf ;
                doc.path = [this.title] ;
                doc.title = path.basename(pdf) ;
                doc.type = "pdf" ;
                doc.project = this.title ;
                ret.push(doc) ;
            }   
        }
        return ret ;
    }
}

export class MTBPacks {
    public active: MTBPack | undefined ;
    public packs: MTBPack[] = [] ;
    public inited: boolean = false ;
    public error: boolean = false ;
    public errstr: string = "" ;

    public constructor() {
    }

    public get(id: string) : MTBPack | undefined {
        for(let pack of this.packs) {
            if (pack.id === id) {
                return pack ;
            }
        }
        return undefined ;
    }

    public async init() : Promise<void> {
        let ret: Promise<void> = new Promise<void>( (resolve, reject) => {
            runMtbQuery("--envinfo")
            .then( (queryout: string) => {
                let inpacks: boolean = false ;
                let pack: MTBPack | undefined ;
                let lines = queryout.split("\n") ;
                for(let i = 0 ; i < lines.length ; i++) {
                    let line: string = lines[i] ;
                    if (inpacks) {
                        if (line.startsWith(mtbSeperatorToken)) {
                            inpacks = false ;
                            pack = undefined ;
                        }
                        else if (i < lines.length - 1 && line[0] !== ' ' && lines[i + 1].startsWith(mtbSeperatorToken)) {
                            inpacks = false ;
                            pack = undefined ;
                        }
                        else if (line[0] !== ' ') {
                            pack = new MTBPack(line.trimEnd()) ;
                            this.packs.push(pack) ;
                        }
                        else {
                            line = line.trim() ;
                            if (line.startsWith(mtbIdKeyword)) {
                                if (pack) {
                                    pack.id = line.substring(mtbIdKeyword.length).trim() ;
                                }
                            }
                            else if (line.startsWith(mtbGuidKeyword)) {
                                if (pack) {
                                    pack.guid = line.substring(mtbGuidKeyword.length).trim() ;
                                }
                            }
                            else if (line.startsWith(mtbPathKeyword)) {
                                if (pack) {
                                    pack.path = line.substring(mtbPathKeyword.length).trim() ;
                                }
                            }
                            else if (line.startsWith(mtbVersionKeyword)) {
                                if (pack) {
                                    pack.version = line.substring(mtbVersionKeyword.length).trim() ;
                                }
                            }
                            else if (line.startsWith(mtbVersionNumberKeyword)) {
                                if (pack) {
                                    pack.versionNumber = line.substring(mtbVersionNumberKeyword.length).trim() ;
                                }
                            }
                        }
                    }
                    else if (i < lines.length - 1 && line.startsWith(mtbPacksToken) && lines[i+1].startsWith(mtbSeperatorToken)) {
                        inpacks = true ;
                        i++ ;
                    }

                }
                this.inited = true ;

                if (process.env[ModusToolboxEnvVarNames.MTB_ENABLE_EARLY_ACCESS]) {
                    let id : string = process.env[ModusToolboxEnvVarNames.MTB_ENABLE_EARLY_ACCESS]! ;
                    for(let pack of this.packs) {
                        if (pack.id === id) {
                            this.active = pack ;
                            break ;
                        }
                    }
                }

                resolve() ;


            })
            .catch((err) => {
                this.error = true ;
                this.errstr = err.toString() ;
                this.inited = true ;
                resolve() ;
            }) ;
        }) ;

        return ret;
    }
}