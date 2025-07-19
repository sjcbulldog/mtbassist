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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTBManifestDB = void 0;
const mtbapp_1 = require("./mtbapp");
const mtbboard_1 = require("./mtbboard");
const mtbmanifestloader_1 = require("./mtbmanifestloader");
const mtbmiddleware_1 = require("./mtbmiddleware");
class MTBManifestDB {
    isLoaded;
    isLoading;
    hadError;
    apps;
    boards;
    middleware;
    loadedCallbacks;
    manifestLoader;
    constructor() {
        this.apps = new Map();
        this.boards = new Map();
        this.middleware = new Map();
        this.loadedCallbacks = [];
        this.isLoaded = false;
        this.isLoading = true;
        this.hadError = false;
    }
    loadManifestData(logger, paths) {
        let ret = new Promise((resolve, reject) => {
            this.manifestLoader = new mtbmanifestloader_1.MtbManifestLoader(logger, this);
            this.manifestLoader.loadManifestData(paths)
                .then(() => {
                this.isLoaded = true;
                this.isLoading = false;
                let msg = "manifest database loaded";
                msg += ", " + this.apps.size + " applications";
                msg += ", " + this.boards.size + " boards";
                msg += ", " + this.middleware.size + " middlewares";
                logger.info(msg);
                for (var cb of this.loadedCallbacks) {
                    try {
                        cb();
                    }
                    catch {
                    }
                }
                resolve();
            })
                .catch(err => {
                this.isLoading = false;
                this.hadError = true;
                let errmsg = err;
                logger.error("error loading manifest database - " + errmsg.message);
                reject(err);
            });
        });
        return ret;
    }
    addLoadedCallback(cb) {
        this.loadedCallbacks.push(cb);
    }
    addApp(logger, app) {
        let finalapp = app;
        if (this.apps.has(app.id)) {
            //
            // Need to merge, the merge might result in an error, so we remove the
            // entry now and add it back if necessary
            //
            let app1 = this.apps.get(app.id);
            this.apps.delete(app.id);
            finalapp = mtbapp_1.MTBApp.merge(logger, app1, app);
        }
        if (finalapp) {
            this.apps.set(app.id, app);
        }
    }
    addBoard(logger, board) {
        let finalboard = board;
        if (this.boards.has(board.id)) {
            //
            // Need to merge, the merge might result in an error, so we remove the
            // entry now and add it back if necessary
            //
            let board1 = this.boards.get(board.id);
            this.boards.delete(board.id);
            finalboard = mtbboard_1.MTBBoard.merge(logger, board1, board);
        }
        if (finalboard) {
            this.boards.set(board.id, finalboard);
        }
    }
    addMiddleware(logger, middleware) {
        let finalmiddle = middleware;
        if (this.middleware.has(middleware.id)) {
            //
            // Need to merge, the merge might result in an error, so we remove the
            // entry now and add it back if necessary
            //
            let middleware1 = this.middleware.get(middleware.id);
            this.middleware.delete(middleware.id);
            finalmiddle = mtbmiddleware_1.MTBMiddleware.merge(logger, middleware1, middleware);
        }
        if (finalmiddle) {
            this.middleware.set(middleware.id, finalmiddle);
        }
    }
    addDependency(id, commit, did, dcommit) {
        let item = this.findItemByID(id);
        if (item) {
            let vers = item.findVersion(commit);
            if (vers) {
                vers.addDependency(did, dcommit);
            }
        }
    }
    findApp(id) {
        return this.apps.get(id);
    }
    findBoard(id) {
        return this.boards.get(id);
    }
    findMiddleware(id) {
        return this.middleware.get(id);
    }
    findItemByID(id) {
        let item;
        item = this.findApp(id);
        if (!item) {
            item = this.findBoard(id);
            if (!item) {
                item = this.findMiddleware(id);
            }
        }
        return item;
    }
}
exports.MTBManifestDB = MTBManifestDB;
//# sourceMappingURL=mtbmanifestdb.js.map