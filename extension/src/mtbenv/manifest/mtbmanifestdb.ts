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

export class MTBManifestDB {
    public isLoaded: boolean;
    public isLoading: boolean;
    public hadError: boolean;

    private apps_: Map<string, MTBApp>;
    private boards_: Map<string, MTBBoard>;
    private middleware_: Map<string, MTBMiddleware>;

    private loadedCallbacks: (() => void)[];
    private manifestLoader?: MtbManifestLoader ;

    constructor() {
        this.apps_ = new Map<string, MTBApp>();
        this.boards_ = new Map<string, MTBBoard>();
        this.middleware_ = new Map<string, MTBMiddleware>();

        this.loadedCallbacks = [] ;

        this.isLoaded = false;
        this.isLoading = true;
        this.hadError = false;
    }

    public get bspNames() : string[] {
        return Array.from(this.boards_.keys()) ;
    }

    public get bsps() : MTBBoard[] {
        return Array.from(this.boards_.values()) ;
    }

    public getCodeExamplesForBSP(bspId: string): Promise<MTBApp[]> {
        let ret = new Promise<MTBApp[]>((resolve, reject) => {
            let bsp = this.boards_.get(bspId);
            if (!bsp) {
                resolve([]);
                return;
            }

            let apps: MTBApp[] = [] ;
            for(let app of this.apps_.values()) {
                let valid = true ;
                for(let req of app.requirements) {
                    if (!bsp.provides.includes(req)) {
                        valid = false;
                        break ;
                    }
                }
                if (valid) {
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

    public loadManifestData(logger: winston.Logger, paths: string[]) : Promise<void> {
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