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
exports.MTBItemVersion = exports.MTBItemVersionDependency = void 0;
class MTBItemVersionDependency {
    id;
    commit;
    constructor(id, commit) {
        this.id = id;
        this.commit = commit;
    }
}
exports.MTBItemVersionDependency = MTBItemVersionDependency;
class MTBItemVersion {
    num;
    commit;
    requirements;
    flows;
    toolsMinVersion;
    dependencies;
    constructor(num, commit) {
        this.num = num;
        this.commit = commit;
        this.toolsMinVersion = undefined;
        this.requirements = [];
        this.flows = [];
        this.dependencies = [];
    }
    setRequirements(reqs) {
        this.requirements = reqs;
    }
    setFlows(flows) {
        this.flows = flows;
    }
    setMinToolsVersion(mintools) {
        this.toolsMinVersion = mintools;
    }
    addDependency(id, commit) {
        this.dependencies.push(new MTBItemVersionDependency(id, commit));
    }
}
exports.MTBItemVersion = MTBItemVersion;
//# sourceMappingURL=mtbitemversion.js.map