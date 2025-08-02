//
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

//
// This file is the main entry point for the ModusToolbox assistant extension.
// This file sets up the various commands and graphical elements of the extension
// to interact with the user.
//


import * as vscode from 'vscode';
import { MTBAssistObject } from './extobj/mtbassistobj';

let extobj: MTBAssistObject | undefined = undefined;

export async function activate(context: vscode.ExtensionContext) {
	MTBAssistObject.initInstance(context);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
