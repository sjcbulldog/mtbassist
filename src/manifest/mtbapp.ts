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

import * as vscode from 'vscode';
import { MTBItemVersion } from './mtbitemversion';

export class MTBApp {
    public readonly name: string;
    public readonly id: string;
    public readonly uri: vscode.Uri;
    public readonly description: string;
    public readonly requirements: string[];
    public readonly versions: MTBItemVersion[];

    constructor(name: string, id: string, uri: vscode.Uri, description: string,
        requirements: string[], versions: MTBItemVersion[]) {
        this.name = name;
        this.id = id;
        this.uri = uri;
        this.description = description;
        this.requirements = requirements;
        this.versions = versions;
    }
}