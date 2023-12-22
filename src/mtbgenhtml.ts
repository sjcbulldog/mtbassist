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

export function getModusToolboxAssistantNewVersion() : string {
    let html : string = 
        `<!DOCTYPE html>
        <head>
        <meta charset="UTF-8">
        <style>
        </head>
        <body>
        <h1>Version ####EXTVERSION####</h1>
        <h2>New Features</h2>
        <h3>Intellisense</h3>
        The ModusToolbox Assistant extension manages intellisense to give the best experience.  For applications
        with multiple projects, a single project is the focus of Intellisense.  The project for Intellisense focus
        can be changed by clicking the MTB status field at the bottom right of the screen.
        ` ;

        html = html.replace("####EXTVERSION####", MTBExtensionInfo.version.toString()) ;
    
        return html ;        

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
                    <button class="tabbutton" id="tabbutton3" onclick="selectContent(event, '2')">ModusToolbox Assistant</button>
                    <button class="tabbutton" id="tabbutton4" onclick="selectContent(event, '3')">ModusToolbox Documentation</button>
                    <button class="tabbutton" id="tabbutton5" onclick="selectContent(event, '4')">Recent Applications</button>
                </div>
                <div style="font-size: 150%;" class="tabcont" id="content1">
                    <h1>Getting Started</h1>
                    <p>There are two ways to get a ModusToolbox application into Visual Studio Code.<p> 
                    <ul>
                    <li>You can <a onclick="vscode.postMessage({ command: 'createNew'}) ;" href="#">create</a> a new project.</li>
                    <li>You can load a project located on your local disk.  It will automatically be prepared for vscode.</li>
                    </ul>
                    
                    <p>Creating a new project, starts the project creator where you can create a new project by selecting a target
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

                <div style="font-size: 150%;" class="tabcont" id="content2">
                    <h1>ModusToolbox Assistant</h1>
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
                <div style="font-size: 150%;" class="tabcont" id="content5">
                    <h1>ModusToolbox Concepts</h1>
                    <h2>Applications & Projects</h2>
                    An <i>application</i> is the top level directory that is managed by ModusToolbox.
                    An <i>application</i> can contain one or more <i>projects</i>.  If an application contains exactly
                    one <i>project</i> then the project directory and the application can be the same directory.  This type of 
                    application is called a <i>combined</i> application.  If an application contains more than a single
                    <i>project</i>, then there must be a directory per project.  For instance, in a PSoC 6 multi-core application,
                    there will be a directory named <b>proj_cm0p</b> for the project that runs on the Cortex-M0P core.  There will
                    also be a directory named <b>proj_cm4</b> for the project that runs on the Cortex-M4 core.
                    <h2>Assets</h2>
                    <h3>Types</h3>
                    Code Examples, Board Support Packages (BSPs), Middleware
                    <h3>Manifests</h3>
                    <h3>Library Manager</h3>
                    <h3>Latest Locking</h3>
                    <h3>make getlibs</h3>
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