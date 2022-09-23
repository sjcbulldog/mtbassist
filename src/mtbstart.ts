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

import { getRecentList } from "./mtbrecent";

export function getModusToolboxAssistantStartupHtml() : string {

    let html : string = `<!DOCTYPE html>
	<html lang="en">
	<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>ModusToolbox Asssitant</title>
	</head>
	<body>
		<script>
		const vscode = acquireVsCodeApi() ;
		</script>
	<h1>ModusToolbox Assistant For ModusToolbox 3.0</h1>
	<hr>
	<ul>
	<li style="font-size: 1.5rem;"><a onclick="vscode.postMessage({ command: 'createNew'}) ;" href="#">Create A New Project</a></li>
	<li style="font-size: 1.5rem;"><a onclick="vscode.postMessage({ command: 'importExisting'}) ;" href="#">Import An Existing Project</a></li>` ;

    let recent : string[] = getRecentList() ;
    if (recent.length > 0) {
        html += `<li style="font-size: 1.5rem;">Recently Opened Projects</li>` ;
        html += `<ul>` ;
        for(let i : number = 0 ; i < recent.length ; i++) {
            let looping: boolean = true ;
            let appdir: string = recent[i] ;
            while (looping) {
                let index: number = appdir.indexOf("\\") ;
                if (index === -1) {
                    looping = false ;
                }
                else {
                    appdir = appdir.replace("\\","/") ;
                }
            }            
            html += '<li style="font-size: 1.5rem;"><a onclick="vscode.postMessage({ command: \'openRecent\', projdir: \'' + appdir + '\'}) ;" href="#">' + recent[i] + '</a></li>' ;
        }
        html += `</ul>` ;
    }

    html += `<li style="font-size: 1.5rem;"><a onclick="vscode.postMessage({ command: 'showModusToolbox'}) ;" href="#">ModusToolbox Assistant Side Bar</a></li>
	<li style="font-size: 1.5rem;"><a onclick="vscode.postMessage({ command: 'showUserGuide'}) ;" href="#">ModusToolbox User's Guide</a></li>
	<li style="font-size: 1.5rem;"><a onclick="vscode.postMessage({ command: 'showReleaseNotes'}) ;" href="#">ModusToolbox Release Notes</a></li>
	</ul>
	<hr>
	<a href="https://www.flaticon.com/free-icons/bot" title="bot icons">Bot icons created by Smashicons - Flaticon</a>
	</body>
	</html>`;

    return html ;
}