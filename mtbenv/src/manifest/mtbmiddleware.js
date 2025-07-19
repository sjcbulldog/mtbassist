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
exports.MTBMiddleware = void 0;
const mtbitem_1 = require("./mtbitem");
class MTBMiddleware extends mtbitem_1.MTBItem {
    uri;
    description;
    category;
    requirements;
    constructor(src, id, name, uri, desc, cat, reqs, versions) {
        super(src, id, name, versions);
        this.uri = uri;
        this.description = desc;
        this.category = cat;
        this.requirements = [...reqs];
        this.requirements.sort();
    }
    static merge(logger, middleware1, middleware2) {
        let ret = middleware1;
        if (middleware1.name !== middleware2.name) {
            mtbitem_1.MTBItem.mergeMsg(logger, middleware1.id, "middleware", "name", middleware1.name, middleware2.name, middleware1.source, middleware2.source);
        }
        if (middleware1.uri !== middleware2.uri) {
            mtbitem_1.MTBItem.mergeMsg(logger, middleware1.id, "middleware", "uri", middleware1.uri.toString(), middleware2.uri.toString(), middleware1.source, middleware2.source);
        }
        if (middleware1.description !== middleware2.description) {
            mtbitem_1.MTBItem.mergeMsg(logger, middleware1.id, "middleware", "description", middleware1.description, middleware2.description, middleware1.source, middleware2.source);
        }
        if (middleware1.category !== middleware2.category) {
            mtbitem_1.MTBItem.mergeMsg(logger, middleware1.id, "middleware", "category", middleware1.category, middleware2.category, middleware1.source, middleware2.source);
        }
        if (!this.compareStringArrays(middleware1.requirements, middleware2.requirements)) {
            mtbitem_1.MTBItem.mergeMsg(logger, middleware1.id, "middleware", "requirements", middleware1.requirements.join(','), middleware2.requirements.join(','), middleware1.source, middleware2.source);
        }
        for (let ver of middleware2.versions) {
            if (middleware1.containsVersion(ver.num)) {
                //
                // We cannot have the same version name in both.  Report an error
                // and skip this element.
                //
                logger.error("two instances of 'middleware' contains the same version '" + ver.num + "'");
                ret = undefined;
            }
        }
        return ret;
    }
}
exports.MTBMiddleware = MTBMiddleware;
//# sourceMappingURL=mtbmiddleware.js.map