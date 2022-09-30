import { rejects } from 'assert';
import fetch, { Response } from 'node-fetch';
import { createHistogram } from 'perf_hooks';
import { Uri } from 'vscode';
import { MTBManifestNames } from './mtbmanifestnames';

export class MtbManifestLoader
{
    static mtbDefaultManifest:string = "https://modustoolbox.infineon.com/manifests/mtb-super-manifest/v2.X/mtb-super-manifest-fv2.xml" ;

    isLoading: boolean ;
    superManifestList: string[] ;
    superManifestData: Map<string, string> ;

    manifestList: string[] ;
    manifestData: Map<Uri, string> ;

    constructor() {
        this.isLoading = false ;
        this.superManifestList = [] ;
        this.superManifestData = new Map<string, string>() ;
        this.manifestList = [] ;
        this.manifestData = new Map<Uri, string>() ;
        this.addSuperManifest(MtbManifestLoader.mtbDefaultManifest) ;
    }

    public clearSuperManifestList() {
        if (this.isLoading) {
            throw new Error("cannot clear super manifest entries while loading") ;
        }

        this.superManifestList = [] ;
        this.superManifestData.clear() ;
        this.manifestList = [] ;
        this.manifestData.clear() ;
    }

    public addSuperManifest(loc: string) {
        if (this.isLoading) {
            throw new Error("cannot add super manifest entries while loading") ;
        }
        this.superManifestList.push(loc) ;
    }

    public loadManifestData() : Promise<void> {
        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
            let promiseArray: Promise<void>[] = [] ;

            for(let loc of this.superManifestList) {
                let pro = this.loadSuperManifestFile(loc) ;
                promiseArray.push(pro) ;
            }

            Promise.all(promiseArray)
                .then(() => {
                    this.processAll() ;
                    resolve() ;
                })
                .catch(err => {
                    reject(err) ;
                }) ;
            }) ;

        return ret ;
    }

    processAll() {
        this.superManifestList.forEach(loc => {
            if (this.superManifestData.has(loc)) {
                let data: string = this.superManifestData.get(loc) as string ;
                this.parseSuperManifest(data) ;
            }
        }) ;
    }

    loadSuperManifestFile(urlname: string) : Promise<void> {
        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
        fetch(urlname)
            .then((resp: Response) => {
                resp.text()
                    .then(text => {
                        this.superManifestData.set(urlname, text) ;
                        resolve() ;
                    })
                    .catch(err => {
                        reject(err) ;
                    }) ;
                })
                .catch((err) => {
                    reject(err) ;
                }) ;
        }) ;

        return ret ;
    }

    processAppManifestList(mlist: any) {
        let urilist: any[] = mlist['app-manifest'] ;
        urilist.forEach(one => {
            this.manifestList.push(one['uri']) ;
        }) ;
    }

    processBoardManifestList(mlist: any) {
        let urilist: any[] = mlist['board-manifest'] ;
        urilist.forEach(one => {
            this.manifestList.push(one['uri']) ;
        }) ;
    }

    processMiddlewareManifestList(mlist: any) {
        let urilist: any[] = mlist['middleware-manifest'] ;
        urilist.forEach(one => {
            this.manifestList.push(one['uri']) ;
        }) ;
    }

    processSuperManifestXML(manifest: any) {
        let toplevel: any = manifest['super-manifest'] ;
        let props = toplevel['$'] ;
        let ver = props['version'] ;
        if (ver !== "2.0") {
            throw new Error("unknown super manifest version '" + ver + "'") ;
        }

        let manlist = toplevel[MTBManifestNames.appManifestList] ;
        this.processAppManifestList(manlist) ;

        manlist = toplevel[MTBManifestNames.boardManifestList] ;
        this.processBoardManifestList(manlist) ;

        manlist = toplevel[MTBManifestNames.middlewareManifesetList] ;
        this.processMiddlewareManifestList(manlist) ;

        console.log("this") ;
    }

    parseSuperManifest(data: string) : Promise<any> {
        var parseString = require('xml2js').parseString;

        let ret : Promise<any> = new Promise<any>((resolve, reject) => {
            parseString(data, {explicitArray : false}, (err: Error, result: object) => {
                if (err) {
                    reject(err) ;
                }
                else {
                    try {
                        this.processSuperManifestXML(result) ;
                    }
                    catch(errobj) {
                        reject(errobj) ;
                    }
                    resolve(result) ;
                }
            }) ;
        }) ;

        return ret ;
    }
}