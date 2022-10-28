//
// Copyright 2022 by C And T Software
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

let titlestr :string = '<p style="font-size:300%;">ModusToolbox Assistant ' + MTBExtensionInfo.version;

export function getModusToolboxNotInstallHtml() : string {
    let html : string = 
        `<!DOCTYPE html>
            <head>
            <meta charset="UTF-8">
            <body>
            ####TITLE####
            <div style="font-size: 150%;">
            <p>The ModusToolbox Assistant extension is designed to be used with ModusToolbox 3.0 or later. However, ModusToolbox 3.0 or later is not installed. 
            Please install ModusToolbox 3.0 or later to use this extensison.</p>
            </div>
            <a href="https://www.infineon.com/cms/en/design-support/tools/sdk/modustoolbox-software/">Click Here To Download ModusToolbox</a>
            </body>
        ` ;

    html = html.replace("####TITLE####", titlestr) ;        

    return html ;
}

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
                const vscode = acquireVsCodeApi() ;
                function showWelcomePageChanged(box) {
                    if (box.checked === true) {
                        vscode.postMessage({ command: 'showWelcomePage'}) ;
                    }
                    else {
                        vscode.postMessage({ command: 'hideWelcomePage'}) ;
                    }
                }

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
                    <button class="tabbutton" id="tabbutton1" onclick="selectContent(event, '1')">Getting Started</button>
                    <button class="tabbutton" id="tabbutton2" onclick="selectContent(event, '2')">Documentation</button>
                    <button class="tabbutton" id="tabbutton3" onclick="selectContent(event, '3')">Recent</button>
                </div>
                <div style="font-size: 150%;" class="tabcont" id="content1">
                    <p>There are two ways to get a new ModusToolbox application into Visual Studio Code.<p> 
                    <ul>
                    <li>You can <a onclick="vscode.postMessage({ command: 'createNew'}) ;" href="#">create</a> a new project</li>
                    <li>You can <a onclick="vscode.postMessage({ command: 'importExisting'}) ;" href="#">import</a> an existing project.</li>
                    </ul>
                    
                    <p>Creating a new project, starts the project creator where you can create a new project by selecting a target
                    board and an example project supported by the target board.</p>

                    <p>Importing a project provides a method to share a project that has been previously created and stored
                    in a git repository.  Importing a project clones the project from the source git repository and
                    then performs a <i>make getlibs</i> operation which readies the project for its location on the local
                    machine.  Finally, the import performs a <i>make vscode</i> operation which initializes the .vscode directory
                    to enable the project to work in the vscode environment.</p>
                    Finally, note most features of ModusToolbox are available by selecting the 
                    <a onclick="vscode.postMessage({ command: 'showModusToolbox'}) ;" href="#">ModusToolbox</a> icon in the Activity Bar, given by the robot icon.
                    This displays the ModusToolbox view in the Side Bar.  See this <a href="https://code.visualstudio.com/docs/getstarted/userinterface">page</a> for more details.
                    <br><br><br>
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
            <br><br>
            <div>
            <a href="https://www.flaticon.com/free-icons/bot" title="bot icons">Bot icons created by Smashicons - Flaticon</a>
            </div>
        </body>
        </html>` ;    

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
    checkstr += '><label for="showWelcomePage">Show ModusToolbox Assistant Welcome Page</label><br>' ;

    html = html.replace("####TITLE####", titlestr) ;
    html = html.replace("####RECENTS####", recentstr) ;
    html = html.replace("####CHECKBOX####", checkstr) ;

    return html ;
}