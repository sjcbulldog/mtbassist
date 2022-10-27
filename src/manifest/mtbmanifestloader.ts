///
// Copyright 2022 by C And T Software
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

import fetch, { Response } from 'node-fetch';
import * as vscode from 'vscode';

import { MessageType, MTBExtensionInfo } from '../mtbextinfo';
import { MTBApp } from './mtbapp';
import { MTBBoard } from './mtbboard';
import { MTBItemVersion } from './mtbitemversion';
import { MtbManifestDb } from './mtbmanifestdb';
import { MTBManifestNames } from './mtbmanifestnames';
import { MTBMiddleware } from './mtbmiddleware';

enum ManifestFileType {
    superManifest,
    contentManifest,
    dependencyManifest
}

export class MtbManifestLoader {
    static mtbDefaultManifest: string = "https://modustoolbox.infineon.com/manifests/mtb-super-manifest/v2.X/mtb-super-manifest-fv2.xml";

    isLoading: boolean;

    superManifestList: string[];
    superManifestData: Map<string, string>;

    manifestContentList: string[];
    manifestContentData: Map<string, string>;

    manifestDepList: string[];
    manifestDepData: Map<string, string>;

    db: MtbManifestDb;

    constructor(db: MtbManifestDb) {
        this.db = db;
        this.isLoading = false;

        this.superManifestList = [];
        this.superManifestData = new Map<string, string>();
        this.manifestContentList = [];
        this.manifestContentData = new Map<string, string>();
        this.manifestDepList = [];
        this.manifestDepData = new Map<string, string>();

        this.addSuperManifest(MtbManifestLoader.mtbDefaultManifest);
    }

    public clearSuperManifestList() {
        if (this.isLoading) {
            throw new Error("cannot clear super manifest entries while loading");
        }

        this.superManifestList = [];
        this.superManifestData.clear();
        this.manifestContentList = [];
        this.manifestContentData.clear();
    }

    public addSuperManifest(loc: string) {
        if (this.isLoading) {
            throw new Error("cannot add super manifest entries while loading");
        }
        this.superManifestList.push(loc);
    }

    public loadManifestData(): Promise<void> {
        let ret: Promise<void> = new Promise<void>((resolve, reject) => {

            this.loadAllSuperManifests()
                .then(() => {
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

    loadAllSuperManifests(): Promise<void[]> {
        let promiseArray: Promise<void>[] = [];

        for (let loc of this.superManifestList) {
            let pro = this.loadManifestFile(loc, ManifestFileType.superManifest);
            promiseArray.push(pro);
        }

        return Promise.all(promiseArray);
    }

    loadAllContentManifests(): Promise<void[]> {
        let manifestPromiseArray: Promise<void>[] = [];
        for (let loc of this.manifestContentList) {
            let pro = this.loadManifestFile(loc, ManifestFileType.contentManifest);
            manifestPromiseArray.push(pro);
        }
        return Promise.all(manifestPromiseArray);
    }

    loadAllDependencyManifests(): Promise<void[]> {
        let manifestPromiseArray: Promise<void>[] = [];
        for (let loc of this.manifestDepList) {
            let pro = this.loadManifestFile(loc, ManifestFileType.dependencyManifest);
            manifestPromiseArray.push(pro);
        }
        return Promise.all(manifestPromiseArray);
    }

    processAllSuperManifests(): Promise<any> {
        let parray: Promise<any>[] = [];
        for(var loc of this.superManifestList) {
            if (this.superManifestData.has(loc)) {
                let data: string = this.superManifestData.get(loc) as string;
                let srcuri: vscode.Uri = vscode.Uri.parse(loc) ;
                parray.push(this.parseSuperManifest(srcuri, data));
            }
        }

        return Promise.all(parray);
    }

    processAllContentManifests(): Promise<void[]> {
        let parray: Promise<void>[] = [];
        for(var loc of this.manifestContentList) {
            if (this.manifestContentData.has(loc)) {
                let data: string = this.manifestContentData.get(loc) as string;
                let srcuri: vscode.Uri = vscode.Uri.parse(loc) ;
                let pro = this.parseContentManifest(srcuri, data);
                parray.push(pro);
            }
        };

        return Promise.all(parray);
    }

    processAllDependencyManifests(): Promise<void[]> {
        let parray: Promise<void>[] = [];
        for(var loc of this.manifestDepList) {
            if (this.manifestDepData.has(loc)) {
                let data: string = this.manifestDepData.get(loc) as string;
                let srcuri: vscode.Uri = vscode.Uri.parse(loc) ;
                let pro = this.parseDependencyManifest(srcuri, data);
                parray.push(pro);
            }
        };

        return Promise.all(parray);
    }

    loadManifestFile(urlname: string, mtype: ManifestFileType): Promise<void> {
        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
            fetch(urlname)
                .then((resp: Response) => {
                    resp.text()
                        .then(text => {
                            if (mtype === ManifestFileType.superManifest) {
                                this.superManifestData.set(urlname, text);
                                let percent: number = this.superManifestData.size / this.superManifestList.length * 100.0;
                                MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "loaded super manifest file (" + percent.toFixed(1) + ") '" + urlname + "'");
                            }
                            else if (mtype === ManifestFileType.contentManifest) {
                                this.manifestContentData.set(urlname, text);
                                let percent: number = this.manifestContentData.size / this.manifestContentList.length * 100.0;
                                MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "loaded content manifest file (" + percent.toFixed(1) + ") '" + urlname + "'");
                            }
                            else if (mtype === ManifestFileType.dependencyManifest) {
                                this.manifestDepData.set(urlname, text);
                                let percent: number = this.manifestDepData.size / this.manifestDepList.length * 100.0;
                                MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "loaded dependency manifest file (" + percent.toFixed(1) + ") '" + urlname + "'");
                            }
                            resolve();
                        })
                        .catch(err => {
                            reject(err);
                        });
                })
                .catch((err) => {
                    reject(err);
                });
        });

        return ret;
    }

    processAppManifestList(mlist: any) {
        let urilist: any[] = mlist['app-manifest'];
        urilist.forEach(one => {
            this.manifestContentList.push(one['uri']);
        });
    }

    processBoardManifestList(mlist: any) {
        let urilist: any[] = mlist['board-manifest'];
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

    processMiddlewareManifestList(mlist: any) {
        let urilist: any[] = mlist['middleware-manifest'];
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

    processApp(src: vscode.Uri, obj: any) {
        let name: string = obj.name as string;
        let id: string = obj.id as string;
        let uri: vscode.Uri = obj.uri as vscode.Uri;
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
        this.db.addApp(app);
    }

    processBoard(src: vscode.Uri, obj: any) {
        let boardUri: vscode.Uri = obj.board_uri as vscode.Uri;
        let category: string = obj.category as string;
        let desc: string = obj.description as string;
        let documentationUri: vscode.Uri = obj.docunentation_uri as vscode.Uri;
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
        this.db.addBoard(board);
    }

    processMiddleware(src: vscode.Uri, obj: any) {
        let id: string = obj.id as string;
        let name: string = obj.name as string;
        let uri: vscode.Uri = obj.uri as vscode.Uri;
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
        this.db.addMiddleware(middleware);
    }

    processDependerVersions(src: vscode.Uri, id: string, versions: any[]) {
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

    processDependencyManifestXml(src: vscode.Uri, manifest: any) {
        let ext: MTBExtensionInfo = MTBExtensionInfo.getMtbExtensionInfo() ;

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

    processContentManifestXML(src: vscode.Uri, manifest: any) {
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

    processSuperManifestXML(src: vscode.Uri, manifest: any) {
        let toplevel: any = manifest['super-manifest'];
        let props = toplevel['$'];
        let ver = props['version'];
        if (ver !== "2.0") {
            throw new Error("unknown super manifest version '" + ver + "'");
        }

        let manlist = toplevel[MTBManifestNames.appManifestList];
        this.processAppManifestList(manlist);

        manlist = toplevel[MTBManifestNames.boardManifestList];
        this.processBoardManifestList(manlist);

        manlist = toplevel[MTBManifestNames.middlewareManifesetList];
        this.processMiddlewareManifestList(manlist);
    }

    parseContentManifest(loc: vscode.Uri, data: string): Promise<void> {
        var parseString = require('xml2js').parseString;

        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
            parseString(data, { explicitArray: false }, (err: Error, result: object) => {
                if (err) {
                    reject(err);
                }
                else {
                    try {
                        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "parsing content manifest file '" + loc + "'");
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

    parseDependencyManifest(loc: vscode.Uri, data: string): Promise<void> {
        var parseString = require('xml2js').parseString;

        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
            parseString(data, { explicitArray: false }, (err: Error, result: object) => {
                if (err) {
                    reject(err);
                }
                else {
                    try {
                        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "parsing dependency manifest file '" + loc + "'");
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

    parseSuperManifest(loc: vscode.Uri, data: string): Promise<any> {
        var parseString = require('xml2js').parseString;

        let ret: Promise<void> = new Promise<void>((resolve, reject) => {
            parseString(data, { explicitArray: false }, (err: Error, result: object) => {
                if (err) {
                    reject(err);
                }
                else {
                    try {
                        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "parsing supermanifest file '" + loc + "'");
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