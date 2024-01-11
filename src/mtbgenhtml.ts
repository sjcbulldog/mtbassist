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
import { MTBExtensionInfo, MessageType } from "./mtbextinfo";
import { getRecentList } from "./mtbrecent";
import * as vscode from 'vscode' ;
import * as path from 'path' ;
import * as fs from 'fs' ;

function computeRecentHtml() : string {
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

    return recentstr ;
}

function computeCheckHtml() : string {
    let checkstr: string = '<input type="checkbox" onclick="showWelcomePageChanged(this);" id="showWelcomePage" name="showWelcomePage"' ;
    if (MTBExtensionInfo.getMtbExtensionInfo().getPersistedBoolean(MTBExtensionInfo.showWelcomePageName, true)) {
        checkstr += "checked" ;
    }
    else {
        checkstr += "unchecked" ;
    }
    checkstr += '><label for="showWelcomePage">Show ModusToolbox Assistant welcome page on startup</label><br>' ;
    return checkstr ;
}

function computeKitHtml() : string {
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

function replaceTokens(token: string, value: string, html: string) : string {
    while (html.indexOf(token) !== -1) {
        html = html.replace(token, value) ;
    }

    return html ;
}

function createPath(view: vscode.Webview, path1: string, path2: string) : vscode.Uri {
    let context: vscode.ExtensionContext = MTBExtensionInfo.getMtbExtensionInfo().context ;

    let uri: vscode.Uri = vscode.Uri.joinPath(context.extensionUri, path1, path2) ;
    return uri;
}

export function getModusToolboxAssistantHTMLPage(webview: vscode.Webview, page: string) : string {

    let context: vscode.ExtensionContext = MTBExtensionInfo.getMtbExtensionInfo().context ;
    let filename: vscode.Uri = vscode.Uri.joinPath(context.extensionUri, "content/html/" + page) ;
    let html: string = "" ;
    
    try {
        html = fs.readFileSync(filename.fsPath).toString() ;
    }
    catch(err) {
        let errobj: Error = err as Error ;
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "could not load HTML file '" + filename.fsPath + "' - " + errobj.message);
        return "" ;
    }

    let titlestr :string = '<p style="font-size:300%;">ModusToolbox Assistant ' + MTBExtensionInfo.version;    
    html = replaceTokens("####TITLE####", titlestr, html) ;
    html = replaceTokens("####RECENTS####", computeRecentHtml(), html) ;
    html = replaceTokens("####CHECKBOX####", computeCheckHtml(), html) ;
    html = replaceTokens("####DEVKITS####", computeKitHtml(), html) ;
    html = replaceTokens("####JSPATH####", createPath(webview, 'content', 'js').toString(), html) ;
    html = replaceTokens("####CSSPATH####", createPath(webview, 'content', 'css').toString(), html) ;

    return html ;
}