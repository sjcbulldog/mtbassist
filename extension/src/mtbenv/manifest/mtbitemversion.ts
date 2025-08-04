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

export class MTBItemVersionDependency
{
    public readonly id: string ;
    public readonly commit: string ;

    constructor(id: string, commit: string) {
        this.id = id ;
        this.commit = commit ;
    }
}

export class MTBItemVersion {
    public readonly num: string;
    public readonly commit: string;
    public requirements: string[];
    public requirementsv2: string[] ;
    public provides: string[];
    public flows: string[];
    public toolsMinVersion: string | undefined;
    public dependencies: MTBItemVersionDependency[] ;

    constructor(num: string, commit: string) {
        this.num = num;
        this.commit = commit;
        this.toolsMinVersion = undefined;
        this.requirements = [];
        this.requirementsv2 = [] ;
        this.provides = [];
        this.flows = [];
        this.dependencies = [] ;
    }

    public setProvides(provides: string[]) {
        this.provides = provides;       
    }

    public setRequirements(reqs: string[]) {
        this.requirements = reqs;
    }

    public setRequirements2(reqs: string[]) {
        this.requirementsv2 = reqs;
    }

    public setFlows(flows: string[]) {
        this.flows = flows;
    }

    public setMinToolsVersion(mintools: string | undefined) {
        this.toolsMinVersion = mintools;
    }

    public addDependency(id: string, commit: string) {
        this.dependencies.push(new MTBItemVersionDependency(id, commit)) ;
    }
}
