"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MtbManifestLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const mtbapp_1 = require("./mtbapp");
const mtbboard_1 = require("./mtbboard");
const mtbitemversion_1 = require("./mtbitemversion");
const mtbmanifestnames_1 = require("./mtbmanifestnames");
const mtbmiddleware_1 = require("./mtbmiddleware");
const vscode_uri_1 = require("vscode-uri");
var ManifestFileType;
(function (ManifestFileType) {
    ManifestFileType[ManifestFileType["superManifest"] = 0] = "superManifest";
    ManifestFileType[ManifestFileType["contentManifest"] = 1] = "contentManifest";
    ManifestFileType[ManifestFileType["dependencyManifest"] = 2] = "dependencyManifest";
})(ManifestFileType || (ManifestFileType = {}));
class MtbManifestLoader {
    logger_;
    isLoading;
    superManifestList;
    superManifestData;
    manifestContentList;
    manifestContentData;
    manifestDepList;
    manifestDepData;
    db;
    constructor(logger, db) {
        this.logger_ = logger;
        this.db = db;
        this.isLoading = false;
        this.superManifestList = [];
        this.superManifestData = new Map();
        this.manifestContentList = [];
        this.manifestContentData = new Map();
        this.manifestDepList = [];
        this.manifestDepData = new Map();
    }
    loadManifestData(paths) {
        this.superManifestList = paths;
        let ret = new Promise((resolve, reject) => {
            let p = this.loadAllSuperManifests();
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
    loadAllSuperManifests() {
        let promiseArray = [];
        for (let loc of this.superManifestList) {
            let pro = this.loadManifestFile(loc, ManifestFileType.superManifest);
            promiseArray.push(pro);
        }
        return Promise.all(promiseArray);
    }
    loadAllContentManifests() {
        let manifestPromiseArray = [];
        for (let loc of this.manifestContentList) {
            let pro = this.loadManifestFile(loc, ManifestFileType.contentManifest);
            manifestPromiseArray.push(pro);
        }
        return Promise.all(manifestPromiseArray);
    }
    loadAllDependencyManifests() {
        let manifestPromiseArray = [];
        for (let loc of this.manifestDepList) {
            let pro = this.loadManifestFile(loc, ManifestFileType.dependencyManifest);
            manifestPromiseArray.push(pro);
        }
        return Promise.all(manifestPromiseArray);
    }
    processAllSuperManifests() {
        let parray = [];
        for (var loc of this.superManifestList) {
            if (this.superManifestData.has(loc)) {
                let data = this.superManifestData.get(loc);
                let srcuri = vscode_uri_1.URI.parse(loc);
                parray.push(this.parseSuperManifest(srcuri, data));
            }
        }
        return Promise.all(parray);
    }
    processAllContentManifests() {
        let parray = [];
        for (var loc of this.manifestContentList) {
            if (this.manifestContentData.has(loc)) {
                let data = this.manifestContentData.get(loc);
                let srcuri = vscode_uri_1.URI.parse(loc);
                let pro = this.parseContentManifest(srcuri, data);
                parray.push(pro);
            }
        }
        ;
        return Promise.all(parray);
    }
    processAllDependencyManifests() {
        let parray = [];
        for (var loc of this.manifestDepList) {
            if (this.manifestDepData.has(loc)) {
                let data = this.manifestDepData.get(loc);
                let srcuri = vscode_uri_1.URI.parse(loc);
                let pro = this.parseDependencyManifest(srcuri, data);
                parray.push(pro);
            }
        }
        ;
        return Promise.all(parray);
    }
    getManifestData(urlname) {
        let ret = new Promise((resolve, reject) => {
            let uri = vscode_uri_1.URI.parse(urlname);
            if (uri.scheme === 'file') {
                let text = fs.readFileSync(uri.fsPath, 'utf8');
                resolve(text);
            }
            else if (uri.scheme === 'http' || uri.scheme === 'https') {
                fetch(urlname)
                    .then((resp) => {
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
        });
        return ret;
    }
    loadManifestFile(urlname, mtype) {
        let ret = new Promise((resolve, reject) => {
            this.getManifestData(urlname)
                .then(text => {
                if (mtype === ManifestFileType.superManifest) {
                    this.superManifestData.set(urlname, text);
                    let percent = this.superManifestData.size / this.superManifestList.length * 100.0;
                    this.logger_.debug("loaded super manifest file (" + percent.toFixed(1) + ") '" + urlname + "'");
                }
                else if (mtype === ManifestFileType.contentManifest) {
                    this.manifestContentData.set(urlname, text);
                    let percent = this.manifestContentData.size / this.manifestContentList.length * 100.0;
                    this.logger_.debug("loaded content manifest file (" + percent.toFixed(1) + ") '" + urlname + "'");
                }
                else if (mtype === ManifestFileType.dependencyManifest) {
                    this.manifestDepData.set(urlname, text);
                    let percent = this.manifestDepData.size / this.manifestDepList.length * 100.0;
                    this.logger_.debug("loaded dependency manifest file (" + percent.toFixed(1) + ") '" + urlname + "'");
                }
                resolve();
            })
                .catch(err => {
                reject(err);
            });
        });
        return ret;
    }
    fixManifestList(src, uriobj) {
        let ret = [];
        if (uriobj.uri) {
            let basename = path.dirname(src.fsPath);
            let fpath = path.join(basename, uriobj.uri);
            let urires = {
                uri: vscode_uri_1.URI.file(fpath).toString(),
            };
            ret.push(urires);
        }
        return ret;
    }
    processAppManifestList(src, mlist) {
        let urilist = mlist['app-manifest'];
        if (!Array.isArray(urilist)) {
            urilist = this.fixManifestList(src, urilist);
        }
        for (let one of urilist) {
            this.manifestContentList.push(one['uri']);
        }
    }
    processBoardManifestList(src, mlist) {
        let urilist = mlist['board-manifest'];
        if (!Array.isArray(urilist)) {
            urilist = this.fixManifestList(src, urilist);
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
        }
        ;
    }
    processMiddlewareManifestList(src, mlist) {
        let urilist = mlist['middleware-manifest'];
        if (!Array.isArray(urilist)) {
            urilist = this.fixManifestList(src, urilist);
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
        }
        ;
    }
    processApp(src, obj) {
        let name = obj.name;
        let id = obj.id;
        let uri = obj.uri;
        let desc = obj.description;
        let reqs = [];
        let versions = [];
        if (obj.req_capabilities) {
            reqs = obj.req_capabilities.split(' ');
        }
        if (obj.versions) {
            let versset = obj.versions.version;
            if (!Array.isArray(versset)) {
                versset = [versset];
            }
            for (var one of versset) {
                let num = one.num;
                let commit = one.commit;
                let reqperver = [];
                if (one['$']) {
                    let attrs = one['$'];
                    if (attrs.req_capabilities_per_version) {
                        reqperver = attrs.req_capabilities_per_version.split(' ');
                    }
                }
                let vers = new mtbitemversion_1.MTBItemVersion(num, commit);
                vers.setRequirements(reqperver);
                versions.push(vers);
            }
        }
        let app = new mtbapp_1.MTBApp(src, name, id, uri, desc, reqs, versions);
        this.db.addApp(this.logger_, app);
    }
    processBoard(src, obj) {
        let boardUri = obj.board_uri;
        let category = obj.category;
        let desc = obj.description;
        let documentationUri = obj.docunentation_uri;
        let id = obj.id;
        let name = obj.name;
        let summary = obj.summary;
        let provs = [];
        let chips = new Map();
        let versions = [];
        if (obj.prov_capabilities) {
            provs = obj.prov_capabilities.split(' ');
        }
        if (obj.chips) {
            let chiptypes = Object.keys(obj.chips);
            for (var ctype of chiptypes) {
                let cvalue = obj.chips[ctype];
                chips.set(ctype, cvalue);
            }
        }
        if (obj.versions) {
            let versset = obj.versions.version;
            if (!Array.isArray(versset)) {
                versset = [versset];
            }
            for (var one of versset) {
                let num = one.num;
                let commit = one.commit;
                let provpervers = [];
                let flows = [];
                if (one['$']) {
                    let attrs = one['$'];
                    if (attrs.req_capabilities_per_version) {
                        provpervers = attrs.prov_capabilities_per_version.split(' ');
                    }
                    if (attrs.flow_version) {
                        flows = attrs.flow_version.split(' ');
                    }
                }
                let vers = new mtbitemversion_1.MTBItemVersion(num, commit);
                vers.setRequirements(provpervers);
                vers.setFlows(flows);
                versions.push(vers);
            }
        }
        let board = new mtbboard_1.MTBBoard(src, id, name, category, desc, summary, boardUri, documentationUri, provs, chips, versions);
        this.db.addBoard(this.logger_, board);
    }
    processMiddleware(src, obj) {
        let id = obj.id;
        let name = obj.name;
        let uri = obj.uri;
        let desc = obj.description;
        let category = obj.category;
        let mintools = undefined;
        let reqs = [];
        let versions = [];
        let flows = [];
        if (obj.req_capabilities) {
            reqs = obj.req_capabilities.split(' ');
        }
        if (obj.versions) {
            let versset = obj.versions.version;
            if (!Array.isArray(versset)) {
                versset = [versset];
            }
            for (var one of versset) {
                let num = one.num;
                let commit = one.commit;
                let reqperver = [];
                if (one['$']) {
                    let attrs = one['$'];
                    if (attrs.req_capabilities_per_version) {
                        reqperver = attrs.req_capabilities_per_version.split(' ');
                    }
                    if (attrs.flow_version) {
                        flows = attrs.flow_version.split(' ');
                    }
                    if (attrs.tools_min_version) {
                        mintools = attrs.tools_min_version;
                    }
                }
                let vers = new mtbitemversion_1.MTBItemVersion(num, commit);
                vers.setFlows(flows);
                vers.setRequirements(reqperver);
                if (mintools) {
                    vers.setMinToolsVersion(mintools);
                }
                versions.push(vers);
            }
        }
        let middleware = new mtbmiddleware_1.MTBMiddleware(src, id, name, uri, desc, category, reqs, versions);
        this.db.addMiddleware(this.logger_, middleware);
    }
    processDependerVersions(src, id, versions) {
        for (var one of versions) {
            let commit = one.commit;
            let dependees = one.dependees.dependee;
            if (!Array.isArray(dependees)) {
                dependees = [dependees];
            }
            for (var dependee of dependees) {
                let did = dependee.id;
                let dcommit = dependee.commit;
                this.db.addDependency(id, commit, did, dcommit);
            }
        }
    }
    processDependencyManifestXml(src, manifest) {
        let deps = manifest.dependencies;
        let dependers = deps.depender;
        if (!Array.isArray(deps.depender)) {
            dependers = [dependers];
        }
        for (var depend of dependers) {
            let id = depend.id;
            let versions = depend.versions.version;
            if (!Array.isArray(versions)) {
                versions = [versions];
            }
            this.processDependerVersions(src, id, versions);
        }
    }
    processContentManifestXML(src, manifest) {
        if (manifest.apps) {
            let apparray = manifest.apps.app;
            if (!Array.isArray(apparray)) {
                apparray = [apparray];
            }
            for (let app of apparray) {
                this.processApp(src, app);
            }
        }
        else if (manifest.boards) {
            let boardarray = manifest.boards.board;
            if (!Array.isArray(boardarray)) {
                boardarray = [boardarray];
            }
            for (let board of boardarray) {
                this.processBoard(src, board);
            }
        }
        else if (manifest.middleware) {
            let middlearray = manifest.middleware.middleware;
            if (!Array.isArray(middlearray)) {
                middlearray = [middlearray];
            }
            for (let middleware of middlearray) {
                this.processMiddleware(src, middleware);
            }
        }
    }
    processSuperManifestXML(src, manifest) {
        let toplevel = manifest['super-manifest'];
        let props = toplevel['$'];
        let ver = props['version'];
        if (ver !== "2.0") {
            throw new Error("unknown super manifest version '" + ver + "'");
        }
        let manlist = toplevel[mtbmanifestnames_1.MTBManifestNames.appManifestList];
        this.processAppManifestList(src, manlist);
        manlist = toplevel[mtbmanifestnames_1.MTBManifestNames.boardManifestList];
        this.processBoardManifestList(src, manlist);
        manlist = toplevel[mtbmanifestnames_1.MTBManifestNames.middlewareManifesetList];
        this.processMiddlewareManifestList(src, manlist);
    }
    parseContentManifest(loc, data) {
        var parseString = require('xml2js').parseString;
        let ret = new Promise((resolve, reject) => {
            parseString(data, { explicitArray: false }, (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    try {
                        this.logger_.debug("parsing content manifest file '" + loc + "'");
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
    parseDependencyManifest(loc, data) {
        var parseString = require('xml2js').parseString;
        let ret = new Promise((resolve, reject) => {
            parseString(data, { explicitArray: false }, (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    try {
                        this.logger_.debug("parsing dependency manifest file '" + loc + "'");
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
    parseSuperManifest(loc, data) {
        var parseString = require('xml2js').parseString;
        let ret = new Promise((resolve, reject) => {
            parseString(data, { explicitArray: false }, (err, result) => {
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
exports.MtbManifestLoader = MtbManifestLoader;
//# sourceMappingURL=mtbmanifestloader.js.map