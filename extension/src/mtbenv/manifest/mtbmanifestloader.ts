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
import * as path from 'path';
import { MTBApp } from './mtbapp';
import { MTBBoard } from './mtbboard';
import { MTBItemVersion } from './mtbitemversion';
import { MTBManifestDB as MTBManifestDB } from './mtbmanifestdb';
import { MTBManifestNames } from './mtbmanifestnames';
import { MTBMiddleware } from './mtbmiddleware';
import { URI } from 'vscode-uri';
import * as winston from 'winston';
import fetch, { Response } from 'node-fetch';

enum ManifestFileType {
    superManifest,
    contentManifest,
    dependencyManifest
}

export class MtbManifestLoader {
    private logger_ : winston.Logger ;
    private isLoading: boolean;

    private superManifestList: string[];
    private superManifestData: Map<string, string>;

    private manifestContentList: string[];
    private manifestContentData: Map<string, string>;

    private manifestDepList: string[];
    private manifestDepData: Map<string, string>;

    private db: MTBManifestDB;

    constructor(logger: winston.Logger, db: MTBManifestDB) {
        this.logger_ = logger;
        this.db = db;
        this.isLoading = false;

        this.superManifestList = [];
        this.superManifestData = new Map<string, string>();
        this.manifestContentList = [];
        this.manifestContentData = new Map<string, string>();
        this.manifestDepList = [];
        this.manifestDepData = new Map<string, string>();
    }

    public loadManifestData(paths: string[]): Promise<void> {
        this.superManifestList = paths ;
        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
            let p = this.loadAllSuperManifests() ;
                p.then(() => {
                    this.processAllSuperManifests()
                        .then((value) => {
                            this.loadAllContentManifests()
                                .then(() => {
                                    this.processAllContentManifests()
                                        .then(() => {
                                            this.loadAllDependencyManifests()
                                                .then(() => {
                                                    this.processAllDependencyManifests()
                                                        .then(() => {
                                                            resolve();
                                                        })
                                                        .catch((err) => {
                                                            reject(err);
                                                        });
                                                })
                                                .catch(err => {
                                                    reject(err);
                                                });
                                        })
                                        .catch(err => {
                                            reject(err);
                                        });
                                })
                                .catch(err => {
                                    reject(err);
                                });
                        })
                        .catch(err => {
                            reject(err);
                        });
                })
                .catch(err => {
                    reject(err);
                });
        });

        return ret;
    }

    private loadAllSuperManifests(): Promise<void[]> {
        let promiseArray: Promise<void>[] = [];

        for (let loc of this.superManifestList) {
            let pro = this.loadManifestFile(loc, ManifestFileType.superManifest);
            promiseArray.push(pro);
        }

        return Promise.all(promiseArray);
    }

    private loadAllContentManifests(): Promise<void[]> {
        let manifestPromiseArray: Promise<void>[] = [];
        for (let loc of this.manifestContentList) {
            let pro = this.loadManifestFile(loc, ManifestFileType.contentManifest);
            manifestPromiseArray.push(pro);
        }
        return Promise.all(manifestPromiseArray);
    }

    private loadAllDependencyManifests(): Promise<void[]> {
        let manifestPromiseArray: Promise<void>[] = [];
        for (let loc of this.manifestDepList) {
            let pro = this.loadManifestFile(loc, ManifestFileType.dependencyManifest);
            manifestPromiseArray.push(pro);
        }
        return Promise.all(manifestPromiseArray);
    }

    private processAllSuperManifests(): Promise<any> {
        let parray: Promise<any>[] = [];
        for(var loc of this.superManifestList) {
            if (this.superManifestData.has(loc)) {
                let data: string = this.superManifestData.get(loc) as string;
                let srcuri: URI = URI.parse(loc) ;
                parray.push(this.parseSuperManifest(srcuri, data));
            }
        }

        return Promise.all(parray);
    }

    private processAllContentManifests(): Promise<void[]> {
        let parray: Promise<void>[] = [];
        for(var loc of this.manifestContentList) {
            if (this.manifestContentData.has(loc)) {
                let data: string = this.manifestContentData.get(loc) as string;
                let srcuri: URI = URI.parse(loc) ;
                let pro = this.parseContentManifest(srcuri, data);
                parray.push(pro);
            }
        };

        return Promise.all(parray);
    }

    private processAllDependencyManifests(): Promise<void[]> {
        let parray: Promise<void>[] = [];
        for(var loc of this.manifestDepList) {
            if (this.manifestDepData.has(loc)) {
                let data: string = this.manifestDepData.get(loc) as string;
                let srcuri: URI = URI.parse(loc) ;
                let pro = this.parseDependencyManifest(srcuri, data);
                parray.push(pro);
            }
        };

        return Promise.all(parray);
    }

    private getManifestData(urlname: string) : Promise<string> {
        let ret = new Promise<string>((resolve, reject) => {
            let uri = URI.parse(urlname) ;
            if (uri.scheme === 'file') {
                let text = fs.readFileSync(uri.fsPath, 'utf8') ;
                resolve(text);
            }
            else if (uri.scheme === 'http' || uri.scheme === 'https') {
                fetch(urlname)
                    .then((resp: Response) => {
                        resp.text()
                            .then(text => {
                                resolve(text);
                            })
                            .catch(err => {
                                reject(err);
                            });
                    })
                    .catch((err) => {
                        reject(err);
                    });                    
            }
        }) ;

        return ret;
    }

    private loadManifestFile(urlname: string, mtype: ManifestFileType): Promise<void> {
        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
            this.getManifestData(urlname)
                .then(text => {
                    if (mtype === ManifestFileType.superManifest) {
                        this.superManifestData.set(urlname, text);
                        let percent: number = this.superManifestData.size / this.superManifestList.length * 100.0;
                        this.logger_.silly("loaded super manifest file (" + percent.toFixed(1) + ") '" + urlname + "'");
                    }
                    else if (mtype === ManifestFileType.contentManifest) {
                        this.manifestContentData.set(urlname, text);
                        let percent: number = this.manifestContentData.size / this.manifestContentList.length * 100.0;
                        this.logger_.silly("loaded content manifest file (" + percent.toFixed(1) + ") '" + urlname + "'");
                    }
                    else if (mtype === ManifestFileType.dependencyManifest) {
                        this.manifestDepData.set(urlname, text);
                        let percent: number = this.manifestDepData.size / this.manifestDepList.length * 100.0;
                        this.logger_.silly("loaded dependency manifest file (" + percent.toFixed(1) + ") '" + urlname + "'");
                    }
                    resolve();
                })
                .catch(err => {
                    reject(err);
                });
        }) ;
        return ret;
    }

    private fixManifestList(src: URI, uriobj: any) : any[] {
        let ret : any[] = [] ;
        if (uriobj.uri) {
            let basename = path.dirname(src.fsPath) ;
            let fpath = path.join(basename, uriobj.uri) ;
            let urires = {
                uri: URI.file(fpath).toString(),
            } ;
            ret.push(urires) ;
        }
        return ret ;
    }

    private processAppManifestList(src: URI, mlist: any) {
        let urilist: any[] = mlist['app-manifest'];
        if (!Array.isArray(urilist)) {
            urilist = this.fixManifestList(src, urilist) ;
        }

        for(let one of urilist) {
            this.manifestContentList.push(one['uri']);
        }
    }

    private processBoardManifestList(src: URI, mlist: any) {
        let urilist: any[] = mlist['board-manifest'];
        if (!Array.isArray(urilist)) {
            urilist = this.fixManifestList(src, urilist) ;
        }

        for (var one of urilist) {
            this.manifestContentList.push(one['uri']);
            let attrs = one['$'];
            if (attrs) {
                let depurl = attrs['dependency-url'];
                if (depurl) {
                    this.manifestDepList.push(depurl);
                }
            }
        };
    }

    private processMiddlewareManifestList(src: URI, mlist: any) {
        let urilist: any[] = mlist['middleware-manifest'];
        if (!Array.isArray(urilist)) {
            urilist = this.fixManifestList(src, urilist) ;
        }

        for (var one of urilist) {
            this.manifestContentList.push(one['uri']);
            let attrs = one['$'];
            if (attrs) {
                let depurl = attrs['dependency-url'];
                if (depurl) {
                    this.manifestDepList.push(depurl);
                }
            }
        };
    }

    private processApp(src: URI, obj: any) {
        let name: string = obj.name as string;
        let id: string = obj.id as string;
        let uri: URI = obj.uri as URI;
        let desc: string = obj.description as string;
        let reqs: string[] = [];
        let versions: MTBItemVersion[] = [];

        if (obj.req_capabilities) {
            reqs = (obj.req_capabilities as string).split(' ');
        }

        if (obj.versions) {
            let versset = obj.versions.version as any[];
            if (!Array.isArray(versset)) {
                versset = [versset] ;
            }
            for (var one of versset) {
                let num: string = one.num as string;
                let commit: string = one.commit as string;
                let reqperver: string[] = [];

                if (one['$']) {
                    let attrs = one['$'];
                    if (attrs.req_capabilities_per_version) {
                        reqperver = (attrs.req_capabilities_per_version as string).split(' ');
                    }
                }

                let vers: MTBItemVersion = new MTBItemVersion(num, commit);
                vers.setRequirements(reqperver);
                versions.push(vers);
            }
        }

        let app: MTBApp = new MTBApp(src, name, id, uri, desc, reqs, versions);
        this.db.addApp(this.logger_, app);
    }

    private processBoard(src: URI, obj: any) {
        let boardUri: URI = obj.board_uri as URI;
        let category: string = obj.category as string;
        let desc: string = obj.description as string;
        let documentationUri: URI = obj.docunentation_uri as URI;
        let id: string = obj.id as string;
        let name: string = obj.name as string;
        let summary: string = obj.summary as string;
        let provs: string[] = [];
        let chips: Map<string, string> = new Map<string, string>();
        let versions: MTBItemVersion[] = [];

        if (obj.prov_capabilities) {
            provs = (obj.prov_capabilities as string).split(' ');
        }

        if (obj.chips) {
            let chiptypes = Object.keys(obj.chips);
            for (var ctype of chiptypes) {
                let cvalue = obj.chips[ctype];
                chips.set(ctype, cvalue);
            }
        }

        if (obj.versions) {
            let versset = obj.versions.version as any[];
            if (!Array.isArray(versset)) {
                versset = [versset] ;
            }
            for (var one of versset) {
                let num: string = one.num as string;
                let commit: string = one.commit as string;
                let provpervers: string[] = [];
                let flows: string[] = [];

                if (one['$']) {
                    let attrs = one['$'];
                    if (attrs.req_capabilities_per_version) {
                        provpervers = (attrs.prov_capabilities_per_version as string).split(' ');
                    }
                    if (attrs.flow_version) {
                        flows = (attrs.flow_version as string).split(' ');
                    }
                }

                let vers: MTBItemVersion = new MTBItemVersion(num, commit);
                vers.setRequirements(provpervers);
                vers.setFlows(flows);
                versions.push(vers);
            }
        }

        let board: MTBBoard = new MTBBoard(src, id, name, category, desc, summary, boardUri, documentationUri, provs, chips, versions);
        this.db.addBoard(this.logger_, board);
    }

    private processMiddleware(src: URI, obj: any) {
        let id: string = obj.id as string;
        let name: string = obj.name as string;
        let uri: URI = obj.uri as URI;
        let desc: string = obj.description as string;
        let category: string = obj.category as string;
        let mintools: string | undefined = undefined;
        let reqs: string[] = [];
        let versions: MTBItemVersion[] = [];
        let flows: string[] = [];

        if (obj.req_capabilities) {
            reqs = (obj.req_capabilities as string).split(' ');
        }

        if (obj.versions) {
            let versset = obj.versions.version as any[];
            if (!Array.isArray(versset)) {
                versset = [versset] ;
            }
            for (var one of versset) {
                let num: string = one.num as string;
                let commit: string = one.commit as string;
                let reqperver: string[] = [];

                if (one['$']) {
                    let attrs = one['$'];
                    if (attrs.req_capabilities_per_version) {
                        reqperver = (attrs.req_capabilities_per_version as string).split(' ');
                    }
                    if (attrs.flow_version) {
                        flows = (attrs.flow_version as string).split(' ');
                    }

                    if (attrs.tools_min_version) {
                        mintools = attrs.tools_min_version as string;
                    }
                }

                let vers: MTBItemVersion = new MTBItemVersion(num, commit);
                vers.setFlows(flows);
                vers.setRequirements(reqperver);
                if (mintools) {
                    vers.setMinToolsVersion(mintools);
                }
                versions.push(vers);
            }
        }

        let middleware: MTBMiddleware = new MTBMiddleware(src, id, name, uri, desc, category, reqs, versions);
        this.db.addMiddleware(this.logger_, middleware);
    }

    private processDependerVersions(src: URI, id: string, versions: any[]) {
        for(var one of versions) {
            let commit:string = one.commit as string ;
            let dependees = one.dependees.dependee ;
            if (!Array.isArray(dependees)) {
                dependees = [dependees] ;
            }

            for (var dependee of dependees) {
                let did = dependee.id as string ;
                let dcommit = dependee.commit as string ;

                this.db.addDependency(id, commit, did, dcommit) ;
            }
        }
    }

    private processDependencyManifestXml(src: URI, manifest: any) {
        let deps = manifest.dependencies ;
        let dependers = deps.depender ;
        if (!Array.isArray(deps.depender)) {
            dependers = [dependers] ;
        }

        for(var depend of dependers) {
            let id = depend.id as string ;
            let versions = depend.versions.version;

            if (!Array.isArray(versions)) {
                versions = [versions] ;
            }
            this.processDependerVersions(src, id, versions) ;
        }
    }

    private processContentManifestXML(src: URI, manifest: any) {
        if (manifest.apps) {
            let apparray = manifest.apps.app as object[];
            if (!Array.isArray(apparray)) {
                apparray = [apparray] ;
            }
            for (let app of apparray) {
                this.processApp(src, app);
            }
        }
        else if (manifest.boards) {
            let boardarray = manifest.boards.board as object[];
            if (!Array.isArray(boardarray)) {
                boardarray = [boardarray] ;
            }
            for (let board of boardarray) {
                this.processBoard(src, board);
            }
        }
        else if (manifest.middleware) {
            let middlearray = manifest.middleware.middleware as object[];
            if (!Array.isArray(middlearray)) {
                middlearray = [middlearray] ;
            }
            for (let middleware of middlearray) {
                this.processMiddleware(src, middleware);
            }
        }
    }

    private processSuperManifestXML(src: URI, manifest: any) {
        let toplevel: any = manifest['super-manifest'];
        let props = toplevel['$'];
        let ver = props['version'];
        if (ver !== "2.0") {
            throw new Error("unknown super manifest version '" + ver + "'");
        }

        let manlist = toplevel[MTBManifestNames.appManifestList];
        this.processAppManifestList(src, manlist);

        manlist = toplevel[MTBManifestNames.boardManifestList];
        this.processBoardManifestList(src, manlist);

        manlist = toplevel[MTBManifestNames.middlewareManifesetList];
        this.processMiddlewareManifestList(src, manlist);
    }

    private parseContentManifest(loc: URI, data: string): Promise<void> {
        var parseString = require('xml2js').parseString;

        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
            parseString(data, { explicitArray: false }, (err: Error, result: object) => {
                if (err) {
                    reject(err);
                }
                else {
                    try {
                        this.logger_.silly("parsing content manifest file '" + loc + "'");
                        this.processContentManifestXML(loc, result);
                    }
                    catch (errobj) {
                        reject(errobj);
                    }
                    resolve();
                }
            });
        });

        return ret;
    }

    private parseDependencyManifest(loc: URI, data: string): Promise<void> {
        var parseString = require('xml2js').parseString;

        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
            parseString(data, { explicitArray: false }, (err: Error, result: object) => {
                if (err) {
                    reject(err);
                }
                else {
                    try {
                        this.logger_.silly("parsing dependency manifest file '" + loc + "'");
                        this.processDependencyManifestXml(loc, result);
                    }
                    catch (errobj) {
                        reject(errobj);
                    }
                    resolve();
                }
            });
        });

        return ret;
    }

    private parseSuperManifest(loc: URI, data: string): Promise<any> {
        var parseString = require('xml2js').parseString;

        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
            parseString(data, { explicitArray: false }, (err: Error, result: object) => {
                if (err) {
                    reject(err);
                }
                else {
                    try {
                        this.logger_.debug("parsing supermanifest file '" + loc + "'");
                        this.processSuperManifestXML(loc, result);
                    }
                    catch (errobj) {
                        reject(errobj);
                    }
                    resolve();
                }
            });
        });

        return ret;
    }
}