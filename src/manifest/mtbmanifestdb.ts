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
            });
    }

    public addApp(app: MTBApp) {
        let finalapp: MTBApp | undefined = app;

        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "added app " + app.id);

        if (this.apps.has(app.id)) {
            //
            // Need to merge, the merge might result in an error, so we remove the
            // entry now and add it back if necessary
            //
            this.apps.delete(app.id);
            finalapp = this.mergeApps(this.apps.get(app.id)!, app);
        }

        if (finalapp) {
            this.apps.set(app.id, app);
        }
    }

    public addBoard(board: MTBBoard) {
        let finalboard: MTBBoard | undefined = board;

        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "added board " + board.id);

        if (this.boards.has(board.id)) {
            //
            // Need to merge, the merge might result in an error, so we remove the
            // entry now and add it back if necessary
            //
            this.boards.delete(board.id);
            finalboard = this.mergeBoards(this.boards.get(board.id)!, board);
        }

        if (finalboard) {
            this.boards.set(board.id, finalboard);
        }
    }

    public addMiddleware(middleware: MTBMiddleware) {
        let finalmiddle: MTBMiddleware | undefined = middleware;

        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "added middleware " + middleware.id);

        if (this.middleware.has(middleware.id)) {
            //
            // Need to merge, the merge might result in an error, so we remove the
            // entry now and add it back if necessary
            //
            this.middleware.delete(middleware.id);
            finalmiddle = this.mergeMiddleware(this.middleware.get(middleware.id)!, middleware);
        }

        if (finalmiddle) {
            this.middleware.set(middleware.id, finalmiddle);
        }
    }

    mergeApps(app1: MTBApp, app2: MTBApp): MTBApp | undefined {
        return undefined;
    }

    mergeBoards(app1: MTBBoard, app2: MTBBoard): MTBBoard | undefined {
        return undefined;
    }

    mergeMiddleware(app1: MTBMiddleware, app2: MTBMiddleware): MTBMiddleware | undefined {
        return undefined;
    }
}