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
exports.MTBItem = void 0;
const mtbversion_1 = require("../misc/mtbversion");
class MTBItem {
    name;
    source;
    id;
    versions;
    constructor(src, id, name, versions) {
        this.name = name;
        this.source = src;
        this.id = id;
        this.versions = versions;
    }
    containsVersion(num) {
        for (let ver of this.versions) {
            if (ver.num === num) {
                return true;
            }
        }
        return false;
    }
    findVersion(commit) {
        for (var ver of this.versions) {
            if (ver.commit === commit) {
                return ver;
            }
        }
        return undefined;
    }
    newerVersions(version) {
        let ret = [];
        let current = mtbversion_1.MTBVersion.fromVVersionString(version);
        for (var item of this.versions) {
            let itemver = mtbversion_1.MTBVersion.fromVVersionString(item.commit);
            if (mtbversion_1.MTBVersion.compare(current, itemver) < 0) {
                ret.push(item.commit);
            }
        }
        return ret;
    }
    static compareStringArrays(a1, a2) {
        if (a1.length !== a2.length) {
            return false;
        }
        for (let index = 0; index < a1.length; index++) {
            if (a1[index] !== a2[index]) {
                return false;
            }
        }
        return true;
    }
    static mergeMsg(logger, id, typestr, field, f1, f2, src1, src2) {
        let msg = "two instances of '" + typestr + "' - '" + id + "' were merged with differing '" + field + "' fields";
        logger.silly(msg);
        msg = "    the first instance was from '" + src1.toString() + "'";
        logger.silly(msg);
        msg = "    the second instance was from '" + src2.toString() + "'";
        logger.silly(msg);
        msg = "    the first '" + field + "' value was '" + f1 + "'";
        logger.silly(msg);
        msg = "    the second '" + field + "' value was '" + f2 + "'";
        logger.silly(msg);
    }
}
exports.MTBItem = MTBItem;
//# sourceMappingURL=mtbitem.js.map