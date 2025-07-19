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
exports.MTBApp = void 0;
const mtbitem_1 = require("./mtbitem");
//
// This class represents a single application or code example that is available and defined
//
class MTBApp extends mtbitem_1.MTBItem {
    description;
    requirements;
    uri;
    constructor(src, name, id, uri, description, requirements, versions) {
        super(src, id, name, versions);
        this.uri = uri;
        this.description = description;
        this.requirements = [...requirements];
        this.requirements.sort();
    }
    static merge(logger, app1, app2) {
        let ret = app1;
        if (app1.name !== app2.name) {
            mtbitem_1.MTBItem.mergeMsg(logger, app1.id, "app", "name", app1.name, app2.name, app1.source, app2.source);
        }
        if (app1.uri !== app2.uri) {
            mtbitem_1.MTBItem.mergeMsg(logger, app1.id, "app", "uri", app1.uri.toString(), app2.uri.toString(), app1.source, app2.source);
        }
        if (app1.description !== app2.description) {
            mtbitem_1.MTBItem.mergeMsg(logger, app1.id, "app", "description", app1.description, app2.description, app1.source, app2.source);
        }
        if (!this.compareStringArrays(app1.requirements, app2.requirements)) {
            mtbitem_1.MTBItem.mergeMsg(logger, app1.id, "app", "requirements", app1.requirements.join(','), app2.requirements.join(','), app1.source, app2.source);
        }
        for (let ver of app2.versions) {
            if (app1.containsVersion(ver.num)) {
                if (app1.uri !== app2.uri) {
                    //
                    // We cannot have the same version name in both.  Report an error
                    // and skip this element.
                    //
                    logger.error("two instances of 'app' contains the same version '" + ver.num + "'");
                    ret = undefined;
                }
            }
        }
        return ret;
    }
}
exports.MTBApp = MTBApp;
//# sourceMappingURL=mtbapp.js.map