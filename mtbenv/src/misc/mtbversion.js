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
exports.MTBVersion = void 0;
class MTBVersion {
    major;
    minor;
    patch;
    build;
    constructor(major, minor, patch, build) {
        if (major !== undefined) {
            this.major = major;
        }
        else {
            this.major = -1;
        }
        if (minor !== undefined) {
            this.minor = minor;
        }
        else {
            this.minor = -1;
        }
        if (patch !== undefined) {
            this.patch = patch;
        }
        else {
            this.patch = -1;
        }
        if (build !== undefined) {
            this.build = build;
        }
        else {
            this.build = -1;
        }
    }
    isGreaterThen(v) {
        let ret = false;
        return MTBVersion.compare(this, v) > 0;
    }
    isLessThen(v) {
        let ret = false;
        return MTBVersion.compare(this, v) < 0;
    }
    isEqual(v) {
        let ret = false;
        return MTBVersion.compare(this, v) === 0;
    }
    static compare(v1, v2) {
        let ret = 0;
        if (v1.major > v2.major) {
            ret = 1;
        }
        else if (v1.major < v2.major) {
            ret = -1;
        }
        else {
            if (v1.minor > v2.minor) {
                ret = 1;
            }
            else if (v1.minor < v2.minor) {
                ret = -1;
            }
            else {
                if (v1.patch > v2.patch) {
                    ret = 1;
                }
                else if (v1.patch < v2.patch) {
                    ret = -1;
                }
                else {
                    if (v1.build > v2.build) {
                        ret = 1;
                    }
                    else if (v1.build < v2.build) {
                        ret = -1;
                    }
                }
            }
        }
        return ret;
    }
    static fromVVersionString(str) {
        let ret = new MTBVersion();
        const regexp3digit = new RegExp("^.*v([0-9]+)\\.([0-9]+)\\.([0-9]+)$");
        let match = regexp3digit.exec(str);
        if (match !== null) {
            let major = +match[1];
            let minor = +match[2];
            let patch = +match[3];
            ret = new MTBVersion(major, minor, patch);
        }
        return ret;
    }
    static fromVersionString(str) {
        let ret = new MTBVersion();
        const regexp3digit = new RegExp("^([0-9]+)\\.([0-9]+)\\.([0-9]+)$");
        const regexp4digit = new RegExp("^([0-9]+)\\.([0-9]+)\\.([0-9]+)\\.([0-9]+)$");
        let match = regexp3digit.exec(str);
        if (match !== null) {
            let major = +match[1];
            let minor = +match[2];
            let patch = +match[3];
            ret = new MTBVersion(major, minor, patch);
        }
        else {
            match = regexp4digit.exec(str);
            if (match !== null) {
                let major = +match[1];
                let minor = +match[2];
                let patch = +match[3];
                let build = +match[4];
                ret = new MTBVersion(major, minor, patch, build);
            }
        }
        return ret;
    }
    static fromToolsVersionString(str) {
        let ret = undefined;
        const regexp = new RegExp("^tools_([0-9]+)\\.([0-9]+)(\\.([0-9]+))?$");
        const match = regexp.exec(str);
        if (match !== null) {
            let major = +match[1];
            let minor = +match[2];
            let patch = (match.length > 4 && match[4]) ? +match[4] : 0;
            ret = new MTBVersion(major, minor, patch);
        }
        return ret;
    }
}
exports.MTBVersion = MTBVersion;
//# sourceMappingURL=mtbversion.js.map