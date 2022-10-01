import fetch, { Response } from 'node-fetch';
import * as vscode from 'vscode' ;

import { MessageType, MTBExtensionInfo } from '../mtbextinfo';
import { MTBApp } from './mtbapp';
import { MTBItemVersion } from './mtbitemversion';
import { MtbManifestDb } from './mtbmanifestdb';
import { MTBManifestNames } from './mtbmanifestnames';

export class MtbManifestLoader
{
    static mtbDefaultManifest:string = "https://modustoolbox.infineon.com/manifests/mtb-super-manifest/v2.X/mtb-super-manifest-fv2.xml" ;

    isLoading: boolean ;
    superManifestList: string[] ;
    superManifestData: Map<string, string> ;

    manifestList: string[] ;
    manifestData: Map<string, string> ;

    db: MtbManifestDb ;

    constructor(db: MtbManifestDb) {
        this.db = db ;
        this.isLoading = false ;
        this.superManifestList = [] ;
        this.superManifestData = new Map<string, string>() ;
        this.manifestList = [] ;
        this.manifestData = new Map<string, string>() ;
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
                let pro = this.loadManifestFile(loc, true) ;
                promiseArray.push(pro) ;
            }

            Promise.all(promiseArray)
                .then(() => {
                    this.processAllSuperManifests()
                        .then((value) => {
                            this.loadAllManifests()
                                .then(() => {
                                    this.processAllManifests()
                                        .then(() => {
                                            resolve() ;
                                        })
                                        .catch(err => {
                                            reject(err) ;
                                        }) ;
                                })
                                .catch(err => {
                                    reject(err) ;
                                }) ;
                        })
                        .catch(err => {
                            reject(err) ;
                        }) ;

                })
                .catch(err => {
                    reject(err) ;
                }) ;
            }) ;

        return ret ;
    }

    loadAllManifests() : Promise<void[]> {
        let manifestPromiseArray: Promise<void>[] = [] ;
        for(let loc of this.manifestList) {
            let pro = this.loadManifestFile(loc, false) ;
            manifestPromiseArray.push(pro) ;
        }
        return Promise.all(manifestPromiseArray) ;

    }

    processAllSuperManifests() : Promise<any> {
        let parray: Promise<any>[] = [] ;
        this.superManifestList.forEach(loc => {
            if (this.superManifestData.has(loc)) {
                let data: string = this.superManifestData.get(loc) as string ;
                parray.push(this.parseSuperManifest(loc, data)) ;
            }
        }) ;

        return Promise.all(parray) ;
    }

    processAllManifests() : Promise<void[]> {
        let parray: Promise<void>[] = [] ;
        this.manifestList.forEach(loc => {
            if (this.manifestData.has(loc)) {
                let data: string = this.manifestData.get(loc) as string ;
                let pro = this.parseManifest(loc, data) ;
                parray.push(pro) ;
            }
        }) ;

        return Promise.all(parray) ;
    }

    loadManifestFile(urlname: string, supermanifest: boolean) : Promise<void> {
        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
        fetch(urlname)
            .then((resp: Response) => {
                resp.text()
                    .then(text => {
                        if (supermanifest) {
                            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "loaded supermanifest file '" + urlname + "'") ;
                        }
                        else {
                            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "loaded manifest file '" + urlname + "'") ;
                        }
                        if (supermanifest) {
                            this.superManifestData.set(urlname, text) ;
                        }
                        else {
                            this.manifestData.set(urlname, text) ;
                        }
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

    processApp(obj: any) {
        let name: string = obj.name as string ;
        let id: string = obj.id as string ;
        let uri: vscode.Uri = obj.uri as vscode.Uri ;
        let desc: string = obj.description as string ;
        let reqs: string[] = [] ;
        let versions: MTBItemVersion[] = [] ;

        if (obj.req_capabilities) {
            reqs = (obj.req_capabilities as string).split(' ') ;
        }

        if (obj.versions) {
            let versset = obj.versions.version as any[] ;
            for (var one of versset) {
                let num:string = one.num as string ;
                let commit: string = one.commit as string ;
                let reqperver:string[] = [] ;

                if (one['$']) {
                    let attrs = one['$'] ;
                    if (attrs.req_capabilities_per_version) {
                        reqperver = (attrs.req_capabilities_per_version as string).split(' ') ;
                    }
                }

                let vers: MTBItemVersion = new MTBItemVersion(num, commit) ;
                vers.setRequirements(reqperver) ;
                versions.push(vers) ;
            }
        }

        let app: MTBApp = new MTBApp(name, id, uri, desc, reqs, versions) ;
        this.db.addApp(app) ;
    }

    processBoard(board: any) {

    }

    processMiddleware(middleware: any) {

    }

    processManifestXML(manifest:any) {
        if (manifest.apps) {
            let apparray = manifest.apps.app as object[] ;
            for(let app of apparray) {
                this.processApp(app) ;
            }
        }
        else if (manifest.boards) {
            let boardarray = manifest.boards.board as object[] ;
            for(let board of boardarray) {
                this.processBoard(board) ;
            }
        }
        else if (manifest.middleware) {
            let middlearray = manifest.middleware.middleware as object[] ;
            for(let middleware of middlearray) {
                this.processMiddleware(middleware) ;
            }
        }
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
    }

    parseManifest(loc: string, data:string) : Promise<void> {
        var parseString = require('xml2js').parseString;

        let ret : Promise<void> = new Promise<void>((resolve, reject) => {
            parseString(data, {explicitArray : false}, (err: Error, result: object) => {
                if (err) {
                    reject(err) ;
                }
                else {
                    try {
                        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "parsing manifest file '" + loc + "'") ;                        
                        this.processManifestXML(result) ;
                    }
                    catch(errobj) {
                        reject(errobj) ;
                    }
                    resolve() ;
                }
            }) ;
        }) ;

        return ret ;
    }

    parseSuperManifest(loc: string, data: string) : Promise<any> {
        var parseString = require('xml2js').parseString;

        let ret : Promise<void> = new Promise<void>((resolve, reject) => {
            parseString(data, {explicitArray : false}, (err: Error, result: object) => {
                if (err) {
                    reject(err) ;
                }
                else {
                    try {
                        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "parsing supermanifest file '" + loc + "'") ;
                        this.processSuperManifestXML(result) ;
                    }
                    catch(errobj) {
                        reject(errobj) ;
                    }
                    resolve() ;
                }
            }) ;
        }) ;

        return ret ;
    }
}