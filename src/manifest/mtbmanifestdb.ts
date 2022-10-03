///
// Copyright 2022 by Apollo Software
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

import { MessageType, MTBExtensionInfo } from "../mtbextinfo";
import { MTBApp } from "./mtbapp";
import { MTBBoard } from "./mtbboard";
import { MtbManifestLoader } from "./mtbmanifestloader";
import { MTBMiddleware } from "./mtbmiddleware";

export class MtbManifestDb {
    public isLoaded: boolean;
    public isLoading: boolean;
    public hadError: boolean;

    apps: Map<string, MTBApp>;
    boards: Map<string, MTBBoard>;
    middleware: Map<string, MTBMiddleware>;

    manifestLoader: MtbManifestLoader;

    constructor() {
        this.apps = new Map<string, MTBApp>();
        this.boards = new Map<string, MTBBoard>();
        this.middleware = new Map<string, MTBMiddleware>();

        this.isLoaded = false;
        this.isLoading = true;
        this.hadError = false;
        this.manifestLoader = new MtbManifestLoader(this);
        this.manifestLoader.loadManifestData()
            .then(() => {
                this.isLoaded = true;
                this.isLoading = false;
            })
            .catch(err => {
                this.isLoading = false;
                this.hadError = true;

                let errmsg: Error = err as Error ;
                MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, 
                        "error loading manifest database - " + errmsg.message) ;
            });
    }

    public addApp(app: MTBApp) {
        let finalapp: MTBApp | undefined = app;

        if (this.apps.has(app.id)) {
            //
            // Need to merge, the merge might result in an error, so we remove the
            // entry now and add it back if necessary
            //
            let app1 = this.apps.get(app.id)! ;
            this.apps.delete(app.id);
            finalapp = this.mergeApps(app1, app);
        }

        if (finalapp) {
            this.apps.set(app.id, app);
        }
    }

    public addBoard(board: MTBBoard) {
        let finalboard: MTBBoard | undefined = board;

        if (this.boards.has(board.id)) {
            //
            // Need to merge, the merge might result in an error, so we remove the
            // entry now and add it back if necessary
            //
            let board1 = this.boards.get(board.id)! ;
            this.boards.delete(board.id);
            finalboard = this.mergeBoards(board1, board);
        }

        if (finalboard) {
            this.boards.set(board.id, finalboard);
        }
    }

    public addMiddleware(middleware: MTBMiddleware) {
        let finalmiddle: MTBMiddleware | undefined = middleware;

        if (this.middleware.has(middleware.id)) {
            //
            // Need to merge, the merge might result in an error, so we remove the
            // entry now and add it back if necessary
            //
            let middleware1 = this.middleware.get(middleware.id)! ;
            this.middleware.delete(middleware.id);
            finalmiddle = this.mergeMiddleware(middleware1, middleware);
        }

        if (finalmiddle) {
            this.middleware.set(middleware.id, finalmiddle);
        }
    }

    compareStringArrays(a1: string[], a2: string[]) : boolean {
        if (a1.length !== a2.length) {
            return false ;
        }

        for(let index: number = 0 ; index < a1.length ; index++) {
            if (a1[index] !== a2[index]) {
                return false ;
            }
        }

        return true ;
    }

    mergeMsg(id: string, typestr: string, field: string, f1: string, f2:string) {
        let ext: MTBExtensionInfo = MTBExtensionInfo.getMtbExtensionInfo() ;
        let msg: string = "two instances of '" + typestr + "' - '" + id + "' were merged with differing '" + field + "' fields" ;
        ext.logMessage(MessageType.warning, msg) ;
        msg = "    the first '" + field + "' value was '" + f1 + "'" ;
        ext.logMessage(MessageType.warning, msg) ;
        msg = "    the second '" + field + "' value was '" + f2 + "'" ;
        ext.logMessage(MessageType.warning, msg) ;
    }

    mergeApps(app1: MTBApp, app2: MTBApp): MTBApp | undefined {
        let ret: MTBApp | undefined = app1 ;

        if (app1.name !== app2.name) {
            this.mergeMsg(app1.id, "app", "name", app1.name, app2.name) ;
        }

        if (app1.uri !== app2.uri) {
            this.mergeMsg(app1.id, "app", "uri", app1.uri.toString(), app2.uri.toString()) ;
        }

        if (app1.description !== app2.description) {
            this.mergeMsg(app1.id, "app", "description", app1.description, app2.description) ;
        }

        if (!this.compareStringArrays(app1.requirements, app2.requirements)) {
            this.mergeMsg(app1.id, "app", "requirements", app1.requirements.join(','), app2.requirements.join(',')) ;
        }

        for(let ver of app2.versions) {
            if (app1.containsVersion(ver.num)) {
                let ext: MTBExtensionInfo = MTBExtensionInfo.getMtbExtensionInfo() ;
                //
                // We cannot have the same version name in both.  Report an error
                // and skip this element.
                //
                ext.logMessage(MessageType.error, "two instances of 'app' contains the same version '" + ver.num + "'") ;
                ret = undefined ;
            }
        }

        return ret;
    }

    mergeBoards(app1: MTBBoard, app2: MTBBoard): MTBBoard | undefined {
        return undefined;
    }

    mergeMiddleware(app1: MTBMiddleware, app2: MTBMiddleware): MTBMiddleware | undefined {
        return undefined;
    }
}