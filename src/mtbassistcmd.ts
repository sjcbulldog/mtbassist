//
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

export class MTBAssistCommand implements vscode.Command
{
    public title : string ;
    public command: string ;
    public tooltip: string ;
    public arguments?: any[] ;

    constructor(t: string, c: string, s:string) {
        this.title = t ;
        this.command = c ;
        this.tooltip = s ;
        this.arguments = undefined ;
    }
}