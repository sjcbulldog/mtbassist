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
import * as vscode from 'vscode' ;
import * as path from 'path' ;

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

    let titlestr :string = '<p style="font-size:300%;">ModusToolbox Assistant ' + MTBExtensionInfo.version;
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
                ret += "<td>-</td>" ;
            }
            ret += "<td>" + kit.version + "</td>" ;
            ret += "<td>" + kit.mode + "</td>" ;
            ret += "<td>" + kit.serial + "</td>" ;
            if (kit.outdated) {
                ret += '<td><a title="Update Firmware" class="dev-link" onclick="vscode.postMessage({ command: \'updatefirmware\', serial: \'' + kit.serial + '\'}) ;">Needs Update</a></td>' ;
            }
            else {
                ret += "<td>OK</td>" ;
            }
            ret += "</tr>" ;
        }
        if (mgr.needsUpgrade()) {
            ret += "<tr>" ;
            ret += '<td style="text-align:center" colspan="5">';
            ret += '<a class="dev-link" title="Update All Devices" onclick="vscode.postMessage({ command: \'updateallfirmware\'});">Update All Devices</a>' ;
            ret += "</td>" ;
            ret += "</tr>" ;
        }
        ret += "</table>" ;
    }
    return ret ;
}

export function genHead() {
    let html : string = 
        `<!DOCTYPE html>
        <head>
        <meta charset="UTF-8">
        <script src="####JSPATH####/jquery-3.7.1.min.js"></script>
        <script src="####JSPATH####/jquery-ui-1.13.2.custom/jquery-ui.js"></script>
        <script src="####JSPATH####/welcome.js"></script>
        <link rel="stylesheet" href="####JSPATH####/jquery-ui-1.13.2.custom/jquery-ui.theme.min.css">
        <link rel="stylesheet" href="####CSSPATH####/base.css">
        <script>
            $(function() {
                $("#accordion").accordion() ;
            }) ;
        </script>
        </head>` ;
    return html ;
}

function genWelcome() {
    let ret = `
    <h3>Getting Started</h3>
    <div style="font-size: 100%;" class="tabcont" id="content1">
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
    </div>` ;

    return ret ;
}

function genAssistant() {
    let ret = `
    <h3>ModusToolbox Assistant</h3>
    <div style="font-size: 100%;" class="tabcont" id="content2">
    <h5>Welcome Page</h5>
    This is the page you are seeing now.  It provides information about the extension as well as enables recent
    projects to be loaded or new projects to be created.

    <h5>ModusToolbox Side Bar</h5>
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

    <h5>Loading ModusToolbox Applications</h5>
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

    <h5>Intellisense</h5>
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

    <h5>ModusToolbox Documentation</h5>
    This extension scans the documentation for the assets that are used as part of all of the projects in the application.  In this scan a map
    is created from the various elements (function, constants, defined, etc.) that are documented as part of an asset.  When in the "C" code editor
    with the cursor over a symbol of interest, a right click brings up the context menu.  The 'ModusToolbox Documentation' menu item should bring
    up the documentation for the symbol under the cursor.  Note, this feature uses the information from the <i>clangd</i> extension to map the symbol
    to an asset.  If the <i>clangd</i>extension is not set up correctly, this feature may not find the documentation.
    <br>

    <h5>ModusToolbox Terminal</h5>
    This extension provide a new type of terminal.  This is the ModusToolbox Shell.  When in the Visual Studio Code TERMINAL window, select the arrow
    to the right of the plus sign to create a new terminal.  Selecting the ModusToolbox Shell will create a shell terminal using the bash shell from
    the ModusToolbox install.
    </div>` ;
    return ret ;    
}

function genDocs() {
    let ret = `
    <h3>ModusToolbox Documetation</h3>
    <div style="font-size: 100%;" class="tabcont" id="content3">
    <a onclick="vscode.postMessage({ command: 'showUserGuide'}) ;" href="#">Open ModusToolbox User's Guide</a><br>
    <br>
    <a onclick="vscode.postMessage({ command: 'showVSCodeGuide'}) ;" href="#">Open Visual Studio For ModusToolbox User's Guide</a> 
    (Does not include this extension but just the base VSCode support from Infineon)<br>
    <br>
    <a onclick="vscode.postMessage({ command: 'showReleaseNotes'}) ;" href="#">Open ModusToolbox Release Notes</a><br>
    <br>
    <br>
    </div>    
    ` ;

    return ret ;
}

function genKits() {
    let ret = `
        <h3>Connected Kits<a onclick="vscode.postMessage({ command: 'refreshKits'}) ;">(Refresh)</a></h3>
        <div style="font-size: 150%;" class="tabcont" id="content4">
        <h4>Connected Kits </h4>
            ####DEVKITS####
        </div>` ;
    return ret ;
}

function genRecent() {
    let ret = `
        <h3>Recent Applications</h3>
        <div style="font-size: 150%;" class="tabcont" id="content5">
            ####RECENTS####
        </div>` ;
    return ret;
}

export function getModusToolboxAssistantStartupHtml(page: string, context: vscode.ExtensionContext) : string {
    let html = genHead() ;

    html += `
        <body>
        ####TITLE####
        <div id="accordion">` ;

    html += genWelcome() ;
    html += genAssistant() ;
    html += genDocs() ;
    html += genKits() ;
    html += genRecent() ;

    html += `
        </div>
        <hr>
        ####CHECKBOX####
        <br><br>

        <div>
        <a href="https://www.flaticon.com/free-icons/bot" title="bot icons">Bot icons created by Smashicons - Flaticon</a>
        </div>    
        </div></body>` ;

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

    let titlestr :string = '<p style="font-size:300%;">ModusToolbox Assistant ' + MTBExtensionInfo.version;    
    html = html.replace("####TITLE####", titlestr) ;
    html = html.replace("####RECENTS####", recentstr) ;
    html = html.replace("####CHECKBOX####", checkstr) ;
    html = html.replace("####DEVKITS####", getKitString()) ;
    html = html.replace("####PAGE####", page) ;

    while (html.indexOf("####JSPATH####") !== -1) {
        html = html.replace("####JSPATH####", path.join(path.normalize(context.extensionPath), "js")) ;
    }

    while (html.indexOf("####CSSPATH####") !== -1) {
        html = html.replace("####CSSPATH####", path.join(path.normalize(context.extensionPath), "css")) ;
    }

    return html ;
}