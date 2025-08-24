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

import * as winston from 'winston';
import { MTBApp } from "./mtbapp";
import { MTBBoard } from "./mtbboard";
import { MTBItem } from "./mtbitem";
import { MTBItemVersion } from "./mtbitemversion";
import { MtbManifestLoader } from "./mtbmanifestloader";
import { MTBMiddleware } from "./mtbmiddleware";
import { PackManifest } from '../packdb/packdb';

export class MTBManifestDB {
    public isLoaded: boolean;
    public isLoading: boolean;
    public hadError: boolean;

    private apps_: Map<string, MTBApp>;
    private boards_: Map<string, MTBBoard>;
    private middleware_: Map<string, MTBMiddleware>;

    private loadedCallbacks: (() => void)[];
    private manifestLoader?: MtbManifestLoader ;

    private eapPath_ : string | undefined = undefined;

    constructor() {
        this.apps_ = new Map<string, MTBApp>();
        this.boards_ = new Map<string, MTBBoard>();
        this.middleware_ = new Map<string, MTBMiddleware>();

        this.loadedCallbacks = [] ;

        this.isLoaded = false;
        this.isLoading = true;
        this.hadError = false;
    }

    public get errorLoading() : boolean {
        return this.hadError ;
    }

    public get eapPath() : string | undefined {
        return this.eapPath_ ;
    }

    public set eapPath(path: string | undefined) {
        this.eapPath_ = path;
    }

    public get bspNames() : string[] {
        return this.activeBSPs.map(b => b.name) ;
    }

    public get activeBSPs() : MTBBoard[] {
        let ret: MTBBoard[] = [];
        for(let bsp of this.boards_.values()) {
            if (!this.eapPath_ || bsp.source.iseap) {
                ret.push(bsp);
            }
        }

        return ret ;
    }

    public get allBspNames() : string[] {
        return [...this.boards_.values()].map(b => b.name).sort() ;
    }

    public get allBsps() : MTBBoard[] {
        return [...this.boards_.values()];
    }

    private getLatestBSPFromId(id: string) : [MTBBoard, MTBItemVersion] | [] {
        let ret : [MTBBoard, MTBItemVersion] | [] = [] ;
        let bsp = this.boards_.get(id);
        if (bsp) {
            let latestVersion = bsp!.getLatestVersion;
            if (latestVersion) {
                ret = [bsp, latestVersion];
            }
        }
        return ret;
    }

    private matchCodeExampleToBSP(example: MTBApp, bsp: MTBBoard, version: MTBItemVersion): boolean {
        let provides : string[] = [...bsp.provides, ...version.provides] ;

        for(let app of example.versions) {
            let reqs = [...example.requirements, ...app.requirements] ;
            let reqsv2 = [...example.requirementsv2, ...app.requirementsv2] ;

            let v1 = true ;
            for(let req of reqs) {
                if (!provides.includes(req)) {
                    v1 = false;
                    break;
                }
            }

            let v2 = true ;
            if (v1) {
                for(let req2 of reqsv2) {
                    if (req2.startsWith('[') && req2.endsWith(']')) {
                        let orgroup = req2.substring(1, req2.length - 1).split(',');
                        let found = false;
                        for(let org of orgroup) {
                            if (provides.includes(org.trim())) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            v2 = false;
                            break;
                        }
                    }
                    else {
                        // This is a non-versioned requirement, just check if the board provides it
                        if (!bsp.provides.includes(req2)) {
                            v2 = false;
                            break;
                        }
                    }
                }
            }

            if (v1 && v2) {
                return true ;
            }
        }
        return false;
    }

    public getCodeExamplesForBSP(bspId: string): Promise<MTBApp[]> {
        let ret = new Promise<MTBApp[]>((resolve, reject) => {
            let [bsp, version] = this.getLatestBSPFromId(bspId) ;
            if (bsp === undefined || version === undefined) {
                resolve([]);
                return;
            }

            let apps: MTBApp[] = [] ;
            for(let app of this.apps_.values()) {
                if (!app.category) {
                    continue ;
                }
                if (this.matchCodeExampleToBSP(app, bsp, version)) {
                    apps.push(app);
                }
            }
            resolve(apps);
        }) ;
        return ret;
    }

    public getBSPByName(name: string): MTBBoard | undefined {
        return this.boards_.get(name);  
    }

    public loadManifestData(logger: winston.Logger, paths: PackManifest[]) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.manifestLoader = new MtbManifestLoader(logger, this);
            this.manifestLoader.loadManifestData(paths)
                .then(() => {
                    this.isLoaded = true;
                    this.isLoading = false;
                    let msg: string = "manifest database loaded" ;
                    msg += ", " + this.apps_.size + " applications" ;
                    msg += ", " + this.boards_.size + " boards" ;
                    msg += ", " + this.middleware_.size + " middlewares" ;
                    logger.info(msg) ;

                    for(var cb of this.loadedCallbacks) {
                        try {
                            cb() ;
                        }
                        catch{
                        }
                    }

                    resolve() ;
                })
                .catch(err => {
                    this.isLoading = false;
                    this.hadError = true;

                    let errmsg: Error = err as Error ;
                    logger.error("error loading manifest database - " + errmsg.message) ;
                    reject(err) ;
                });
        }) ;
        return ret ;
    }

    public addLoadedCallback(cb: () => void) {
        this.loadedCallbacks.push(cb) ;
    }

    public addApp(logger: winston.Logger, app: MTBApp) {
        let finalapp: MTBApp | undefined = app;

        if (this.apps_.has(app.id)) {
            //
            // Need to merge, the merge might result in an error, so we remove the
            // entry now and add it back if necessary
            //
            let app1 = this.apps_.get(app.id)! ;
            this.apps_.delete(app.id);
            finalapp = MTBApp.merge(logger, app1, app);
        }

        if (finalapp) {
            this.apps_.set(app.id, app);
        }
    }

    public addBoard(logger: winston.Logger, board: MTBBoard) {
        let finalboard: MTBBoard | undefined = board;

        if (this.boards_.has(board.id)) {
            //
            // Need to merge, the merge might result in an error, so we remove the
            // entry now and add it back if necessary
            //
            let board1 = this.boards_.get(board.id)! ;
            this.boards_.delete(board.id);
            finalboard = MTBBoard.merge(logger, board1, board);
        }

        if (finalboard) {
            this.boards_.set(board.id, finalboard);
        }
    }

    public addMiddleware(logger: winston.Logger, middleware: MTBMiddleware) {
        let finalmiddle: MTBMiddleware | undefined = middleware;

        if (this.middleware_.has(middleware.id)) {
            //
            // Need to merge, the merge might result in an error, so we remove the
            // entry now and add it back if necessary
            //
            let middleware1 = this.middleware_.get(middleware.id)! ;
            this.middleware_.delete(middleware.id);
            finalmiddle = MTBMiddleware.merge(logger, middleware1, middleware);
        }

        if (finalmiddle) {
            this.middleware_.set(middleware.id, finalmiddle);
        }
    }

    public addDependency(id: string, commit: string, did: string, dcommit: string) {
        let item: MTBItem | undefined = this.findItemByID(id) ;
        if (item) {
            let vers: MTBItemVersion | undefined = item.findVersion(commit) ;
            if (vers) {
                vers.addDependency(did, dcommit) ;
            }
        }
    }

    public findApp(id: string) : MTBApp | undefined {
        return this.apps_.get(id) ;
    }

    public findBoard(id: string) : MTBBoard | undefined {
        return this.boards_.get(id) ;
    }

    public findMiddleware(id: string) : MTBMiddleware | undefined {
        return this.middleware_.get(id) ;
    }

    public findItemByID(id:string) : MTBItem | undefined {
        let item: MTBItem | undefined ;

        item = this.findApp(id) ;
        if (!item) {
            item = this.findBoard(id) ;
            if (!item) {
                item = this.findMiddleware(id) ;
            }
        }

        return item ;
    }
}