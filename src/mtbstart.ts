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

import { MTBExtensionInfo } from "./mtbextinfo";
import { getRecentList } from "./mtbrecent";

export function getModusToolboxAssistantStartupHtml() : string {
    let html : string = 
        `<!DOCTYPE html>
            <head>
            <meta charset="UTF-8">
            <style>
                div.tabbar
                {
                    overflow: hidden;
                    border: 1px solid #ccc;
                    background-color: #404040;
                }

                div.tabcont
                {
                    visibility: visible;
                }

                .tabbar button {
                    background-color: inherit;
                    float: left;
                    border: none;
                    outline: none;
                    cursor: pointer;
                    padding: 14px 16px;
                    transition: 0.3s;
                    color: white ;
                }

                .tabbar button:hover {
                    background-color: #808080;
                }

                div.content {
                    padding: 6px 12px;
                    border: 4px solid #ccc;
                    border-top: none;
                }
            </style>
            <script>
                function selectContent(evt, which) {
                    let buttons = document.getElementsByClassName("tabbutton") ;
                    for(var button of buttons) {
                        button.style.backgroundColor = "#202020" ;
                        button.style.color = "#FFFFFF" ;
                    }

                    let contents = document.getElementsByClassName("tabcont") ;
                    for(var content of contents) {
                        content.style.display = "none" ;
                    }

                    let selbutton = document.getElementById("tabbutton" + which) ;
                    selbutton.style.backgroundColor = "#ffffffff" ;
                    selbutton.style.color = "#000000ff" ;

                    let selcontent = document.getElementById("content" + which) ;
                    selcontent.style.display = "block" ;
                }

                document.addEventListener("DOMContentLoaded", function() {
                    selectContent(undefined, "1") ;
                }) ;
            </script>
        </head>

        <body>
            ####TITLE####
            <div class="tabview">
                <div class="tabbar">
                    <button class="tabbutton" id="tabbutton1" onclick="selectContent(event, '1')">Tools</button>
                    <button class="tabbutton" id="tabbutton2" onclick="selectContent(event, '2')">Documentation</button>
                    <button class="tabbutton" id="tabbutton3" onclick="selectContent(event, '3')">Recent</button>
                </div>
                <div style="font-size: 150%;" class="tabcont" id="content1">
                    <a onclick="vscode.postMessage({ command: 'createNew'}) ;" href="#">Create A New Project</a><br>
                    <a onclick="vscode.postMessage({ command: 'importExisting'}) ;" href="#">Import An Existing Project</a><br>
                    <a onclick="vscode.postMessage({ command: 'showModusToolbox'}) ;" href="#">Show ModusToolbox Assistant Side Bar</a><br>
                </div>
                <div style="font-size: 150%;" class="tabcont" id="content2">
                   <a onclick="vscode.postMessage({ command: 'showUserGuide'}) ;" href="#">Open ModusToolbox User's Guide</a><br>
                   <a onclick="vscode.postMessage({ command: 'showReleaseNotes'}) ;" href="#">Open ModusToolbox Release Notes</a><br>    
                </div>
                <div style="font-size: 150%;" class="tabcont" id="content3">
                    ####RECENTS####
                </div>
            </div>
            <hr>
            ####CHECKBOX####
            <div style="position: absolute; bottom: 0; width: 100%; height:60px">
            <a href="https://www.flaticon.com/free-icons/bot" title="bot icons">Bot icons created by Smashicons - Flaticon</a>
            </div>
        </body>
        </html>` ;    

    let titlestr :string = '<p style="font-size:300%;">ModusToolbox Assistant 1.0' ;

    let recentstr : string = "" ;
    let recent : string[] = getRecentList() ;
    if (recent.length > 0) {
        for(let i : number = recent.length - 1 ; i >= 0 ; i--) {
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
            recentstr += '<div><a onclick="vscode.postMessage({ command: \'openRecent\', projdir: \'' + appdir + '\'}) ;" href="#">' + recent[i] + '</a></div>' ;
        }
    }

    let checkstr: string = '<input type="checkbox" onclick="showWelcomePageChanged(this);" id="showWelcomePage" name="showWelcomePage"' ;
    if (MTBExtensionInfo.getMtbExtensionInfo().getPresistedBoolean(MTBExtensionInfo.showWelcomePageName, true)) {
        checkstr += "checked" ;
    }
    else {
        checkstr += "unchecked" ;
    }
    checkstr += '><label for="showWelcomePage">Show Plugin Page</label><br>' ;

    html = html.replace("####TITLE####", titlestr) ;
    html = html.replace("####RECENTS####", recentstr) ;
    html = html.replace("####CHECKBOX####", checkstr) ;

    return html ;
}