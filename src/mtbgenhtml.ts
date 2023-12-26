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
                    <button class="tabbutton" id="tabbutton2" onclick="selectContent(event, '2')">ModusToolbox Assistant</button>
                    <button class="tabbutton" id="tabbutton3" onclick="selectContent(event, '3')">ModusToolbox Documentation</button>
                    <button class="tabbutton" id="tabbutton4" onclick="selectContent(event, '4')">Recent Applications</button>
                </div>
                <div style="font-size: 100%;" class="tabcont" id="content1">
                    <h3>Getting Started</h3>
                    <p>There are two ways to get a ModusToolbox application into Visual Studio Code.<p> 
                    <ul>
                    <li>You can <a onclick="vscode.postMessage({ command: 'createNew'}) ;" href="#">create</a> a new project.</li>
                    <li>You can load a project located on your local disk.</li>
                    </ul>
                    
                    <p>Creating a new project, starts the project creator where you can select a target
                    board and an example project supported by the target board.</p>

                    <p>Load a local project by using the File/Open Folder or File/Open Workspace From File... menu items.
                    This provides a method to share a project that has been previously created and stored
                    in a remote repository.  Loading the project locally performs a <i>make getlibs</i> operation which readies 
                    the project for its location on the local machine.  Finally, the import performs a <i>make vscode</i> 
                    operation which initializes the .vscode directory to enable the project to work in the vscode environment.</p>

                    <p>Finally, note most features of ModusToolbox are available by selecting the 
                    <a onclick="vscode.postMessage({ command: 'showModusToolbox'}) ;" href="#">ModusToolbox</a> icon in the Activity Bar, given by the robot icon.
                    This displays the ModusToolbox view in the Side Bar.  See this <a href="https://code.visualstudio.com/docs/getstarted/userinterface">page</a> for more details.</p>
                    <br><br><br>
                </div>
                <div style="font-size: 100%;" class="tabcont" id="content2">
                    <h3>ModusToolbox Assistant</h3>
                    <h4>Welcome Page</h4>
                    This is the page you are seeing now.  It provides information about the extension as well as enables recent
                    projects to be loaded.
                    <h4>ModusToolbox Side Bar</h4>
                    The side bar shows information about the loaded applications, the tools that are valid for the current appilcation,
                    the documentation that is valid for the current application, and the assets that are used in the current application.
                    If any of these assets have newer versions, it is prefaced with the '*' character.  Clicking on an asset will bring
                    up the library manager.
                    <h4>Loading ModusToolbox Applications</h4>
                    When a directory or workspace is opened in Visual Studio Code, the ModusToolbox assistant does a quick check to determine
                    if the directory or workspace is a valid ModusToolbox application.  If it is, then the ModusToolbox assistant does the following:
                    <ul>
                    <li> checks for the presence of the necessary assets to build and query the application.  If these assets are missing, 'make getlibs' is run
                    to retreive them.</li>
                    <li> checks for the presence of a .vscode directory.  If it is missing, runs 'make vscode' to create the directory.</li>
                    <li> checks to see if there is more than one project in the application.  If there is, prompts the user to select the valid 
                    Intellisense project</li>
                    </ul>
                    <h4>Intellisense</h4>
                    The <i>clangd</i> extension is a dependency of this extension as the <i>clangd</i> works much better in the ModusToolbox application
                    structure.
                    <h4>ModusToolbox Documentation</h4>
                </div>
                <div style="font-size: 150%;" class="tabcont" id="content3">
                    <h1>ModusToolbox Documentation<h1>
                   <a onclick="vscode.postMessage({ command: 'showUserGuide'}) ;" href="#">Open ModusToolbox User's Guide</a><br>
                   <a onclick="vscode.postMessage({ command: 'showReleaseNotes'}) ;" href="#">Open ModusToolbox Release Notes</a><br>    
                </div>
                <div style="font-size: 150%;" class="tabcont" id="content4">
                    <h1>Recent Applications</h1>
                    ####RECENTS####
                </div>
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
    if (MTBExtensionInfo.getMtbExtensionInfo().getPersistedBoolean(MTBExtensionInfo.showWelcomePageName, true)) {
        checkstr += "checked" ;
    }
    else {
        checkstr += "unchecked" ;
    }
    checkstr += '><label for="showWelcomePage">Show ModusToolbox Assistant welcome page on startup</label><br>' ;

    html = html.replace("####TITLE####", titlestr) ;
    html = html.replace("####RECENTS####", recentstr) ;
    html = html.replace("####CHECKBOX####", checkstr) ;

    return html ;
}