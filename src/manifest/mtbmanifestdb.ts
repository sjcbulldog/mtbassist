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
                MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "manifest database loaded") ;
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
            finalapp = MTBApp.merge(app1, app);
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
            finalboard = MTBBoard.merge(board1, board);
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
            finalmiddle = MTBMiddleware.merge(middleware1, middleware);
        }

        if (finalmiddle) {
            this.middleware.set(middleware.id, finalmiddle);
        }
    }
}