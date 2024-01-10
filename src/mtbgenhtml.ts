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

import { MTBDevKitMgr } from "./mtbdevicekits";
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

function getKitString() : string {
    let ret: string = "<h2>Detecting ...</h2>" ;

    let mgr: MTBDevKitMgr | undefined = MTBExtensionInfo.getMtbExtensionInfo().getKitMgr() ;
    if (mgr) {
        ret = "" ;
        ret += '<table class="device-table">';
        ret += "<thead>";
        ret += "<tr>" ;
        ret += "<th>Name</th>" ;
        ret += "<th>Version</th>" ;
        ret += "<th>Mode</th>" ;
        ret += "<th>Serial</th>" ;
        ret += "<th>Status</th>" ;
        ret += "</tr>" ;
        ret += "</thread>" ;
        for(let kit of mgr.kits) {
            ret += "<tr>" ;
            if (kit.name) {
                ret += "<td>" + kit.name + "</td>" ;
            }
            else {
                ret += "<td>Unknown</td>" ;
            }
            ret += "<td>" + kit.version + "</td>" ;
            ret += "<td>" + kit.mode + "</td>" ;
            ret += "<td>" + kit.serial + "</td>" ;
            if (kit.outdated) {
                ret += '<td><a title="Update Firmware" class="dev-link" onclick="vscode.postMessage({ command: \'updatefirmware\', serial: \'' + kit.serial + '\'}) ;">Needs Update</td>' ;
            }
            else {
                ret += "<td>OK</td>" ;
            }
            ret += "</tr>" ;
        }
        ret += "</table>" ;
    }
    return ret ;
}

export function getModusToolboxAssistantStartupHtml(page: string) : string {
    let html : string = 
        `<!DOCTYPE html>
            <head>
            <meta charset="UTF-8">
            <style>
                .dev-link a:link {
                    color: #34eb55
                }
                .dev-link a:visited {
                    color: #34eb55
                }
                .device-table {
                    border-collapse: collapse ;
                    margin: 25px 0;
                    font-size: 0.9em;
                    font-family: sans-serif;
                    min-width: 400px;
                    box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
                }
                .device-table thead tr {
                    background-color: #009879;
                    color: #ffffff;
                    text-align: left;
                }
                .device-table th,
                .device-table td {
                    padding: 12px 15px;
                }

                .device-table tbody tr {
                    border-bottom: 1px solid #dddddd;
                }
                
                .device-table tbody tr:nth-of-type(even) {
                    background-color: #f3f3f3;
                }
                
                .device-table tbody tr:last-of-type {
                    border-bottom: 2px solid #009879;
                }     
                
                .device-table tbody tr.active-row {
                    font-weight: bold;
                    color: #009879;
                }                

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
                    selectContent(undefined, "####PAGE####") ;
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
                    <button class="tabbutton" id="tabbutton4" onclick="selectContent(event, '4')">Connected Dev Kits</button>
                    <button class="tabbutton" id="tabbutton5" onclick="selectContent(event, '5')">Recent Applications</button>
                </div>
                <div style="font-size: 100%;" class="tabcont" id="content1">
                    <h3>Getting Started</h3>
                    <p>There are two ways to get a ModusToolbox application into Visual Studio Code.</p> 
                    <ul>
                    <li>You can <a onclick="vscode.postMessage({ command: 'createNew'}) ;" href="#">create</a> a new application.</li>
                    <p>Creating a new application, starts the ModusToolbox project creator tool where a target
                    board (BSP) and assocaited code example can be selected.
                    <li>You can load an allocation from a local folder or local workspace located on your local disk.</li>
                    <p>Load a local ModusToolbox application by using the File/Open Folder or File/Open Workspace From File... menu items.
                    This provides a method to share a project that has been previously created and stored
                    in a remote repository.  Loading the project locally performs a <i>make getlibs</i> operation which readies 
                    the project for its location on the local machine.  Finally, the import performs a <i>make vscode</i> 
                    operation which initializes the .vscode directory to enable the project to work in the vscode environment.</p>
                    </ul>                  

                    <p>Finally, note most features of ModusToolbox are available by selecting the 
                    <a onclick="vscode.postMessage({ command: 'showModusToolbox'}) ;" href="#">ModusToolbox</a> icon in the Activity Bar, given by the robot icon.
                    This displays the ModusToolbox view in the Side Bar.  See this <a href="https://code.visualstudio.com/docs/getstarted/userinterface">page</a> for more details.</p>
                    <br><br><br>
                </div>
                <div style="font-size: 100%;" class="tabcont" id="content2">
                    <h3>ModusToolbox Assistant</h3>
                    <h4>Welcome Page</h4>
                    This is the page you are seeing now.  It provides information about the extension as well as enables recent
                    projects to be loaded or new projects to be created.

                    <h4>ModusToolbox Side Bar</h4>
                    The side bar contains four different ModusToolbox related tree views.
                    <br>
                    The first of the tree views shows shows Application Info.  This view displays the application type, target BSP, MCU Device, other devices, and 
                    components for each of the projects. <br>

                    The second of the tree views shows ModusToolbox Tools that are valid for the current application.  These tools are divided into tools that are global to
                    ModusToolbox, tools that effect the application, tools that effect the BSP, and tools that effect individual projects.<br>

                    The third of the tree views shows ModusToolbox Documentation that is valid for the current application. This is the documentation for the assets that
                    are references in each of the projects and therefore is organized by project.<br>

                    The fourth of the tree views shows a list of ModusToolbox assets that are required by each project in the application.  Therefore there is a list per
                    project.  The version number of each asset is shown and if there is a leading '*' character, this means there is a newer version of the assset
                    available.  Clicking on an asset will bring up the library manager.<br>

                    <h4>Loading ModusToolbox Applications</h4>
                    When a directory or workspace is opened in Visual Studio Code, the ModusToolbox assistant does a quick check to determine
                    if the directory or workspace is a valid ModusToolbox application.  If it is, then the ModusToolbox assistant does the following:
                    <ul>
                    <li> Checks for the presence of the necessary assets to build and query the application.  If these assets are missing, 'make getlibs' is run
                    to retreive them.</li>
                    <li> Checks for the presence of a the vscode setup directory.  If it is missing, runs 'make vscode' to create the directory.</li>
                    <li> Checks to see if all of the necessary assets needed to build the application are present.  If not, the user is prompted to run 'make getlibs'
                    to download all required assets.
                    <li> Checks to see if there is more than one project in the application.  If there is, prompts the user to select the valid
                    Intellisense project</li>
                    </ul>

                    <h4>Intellisense</h4>
                    If the <i>clangd</i> extension is loaded, this extension can manage the intellisense configuration.  This is important because a ModusToolbox
                    applicaiton can contain more than one buildable project.  Intellisense must be focused on a single one of these projects in a ModusToolbox
                    application.  When the <i>clangd</i> extension is loaded, there will be a prompt to disabled the Microsoft Intellisense.  Select yes to disable
                    the Microsoft Intellisense.  The <i>clangd</i> extension will replace it.  In the <i>clangd</i> documentation there is information for how to
                    set up the extension including settings the 'compile-commands' directory and the 'query-driver' value.  These DO NOT NEED to be configurred as
                    the ModusToolbox Assistant will set these up as applications are loaded to reflect the active tools package and focus project.
                    
                    <br>
                    When more than one project exists in a ModusToolbox application, the <i>clangd</i> must know which project is the target of the
                    Intellisense processing.  When an application is loaded with more than one project in the application, the user is prompted to select the 
                    project that should be the focus of Intellisense.  The "MTB" item in the status bar (bottom right) will indicated what project is currently the 
                    focus of intellisense.  Clicking this status item will allow the focus project to be changed.

                    <h4>ModusToolbox Documentation</h4>
                    This extension scans the documentation for the assets that are used as part of all of the projects in the application.  In this scan a map
                    is created from the various elements (function, constants, defined, etc.) that are documented as part of an asset.  When in the "C" code editor
                    with the cursor over a symbol of interest, a right click brings up the context menu.  The 'ModusToolbox Documentation' menu item should bring
                    up the documentation for the symbol under the cursor.  Note, this feature uses the information from the <i>clangd</i> extension to map the symbol
                    to an asset.  If the <i>clangd</i>extension is not set up correctly, this feature may not find the documentation.
                    <br>

                    <h4>ModusToolbox Terminal</h4>
                    This extension provide a new type of terminal.  This is the ModusToolbox Shell.  When in the Visual Studio Code TERMINAL window, select the arrow
                    to the right of the plus sign to create a new terminal.  Selecting the ModusToolbox Shell will create a shell terminal using the bash shell from
                    the ModusToolbox install.
                </div>
                <div style="font-size: 100%;" class="tabcont" id="content3">
                    <h3>ModusToolbox Documentation</h3>
                   <a onclick="vscode.postMessage({ command: 'showUserGuide'}) ;" href="#">Open ModusToolbox User's Guide</a><br>
                   <br>
                   <a onclick="vscode.postMessage({ command: 'showVSCodeGuide'}) ;" href="#">Open Visual Studio For ModusToolbox User's Guide</a> 
                   (Does not include this extension but just the base VSCode support from Infineon)<br>
                   <br>
                   <a onclick="vscode.postMessage({ command: 'showReleaseNotes'}) ;" href="#">Open ModusToolbox Release Notes</a><br>
                   <br>
                   <br>
                </div>
                <div style="font-size: 150%;" class="tabcont" id="content4">
                    <h1>Connected Development Kits <a onclick="vscode.postMessage({ command: 'refreshKits'}) ;">(Refresh)</a></h1>
                    ####DEVKITS####
                </div>
                <div style="font-size: 150%;" class="tabcont" id="content5">
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
    html = html.replace("####DEVKITS####", getKitString()) ;
    html = html.replace("####PAGE####", page) ;

    return html ;
}