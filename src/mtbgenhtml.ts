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
import * as vscode from 'vscode' ;
import * as path from 'path' ;
import * as fs from 'fs' ;
import { RecentEntry } from "./mtbrecent";

function computeRecentHtml() : string {
    let index: number = -1 ;
    let ret : string = "" ;
    let recent : RecentEntry[] = MTBExtensionInfo.getMtbExtensionInfo().getRecentAppMgr().getRecentList();
    if (recent.length > 0) {
        ret += '<table class="recent-table">' ;
        ret += "<thead>";
        ret += "<tr>" ;
        ret += "<th>Name</th>" ;
        ret += "<th>Path</th>" ;
        ret += "<th>Last Opened</th>" ;
        ret += "</tr>" ;
        ret += "</thead>";
        for(let i : number = recent.length - 1 ; i >= 0 ; i--) {
            const appdir: string = recent[i].apppath.replace(/\\/g,"/") ;
            const recentname: string = path .basename(appdir);

            ret += "<tr>" ;
            ret += "<td>" ;
            ret += '<a onclick="vscode.postMessage({ command: \'openRecent\', projdir: \'' + appdir + '\'}) ;" href="#">' + recentname + '</a>' ;
            ret += "</td>" ;

            ret += "<td>" ;
            ret += appdir ;
            ret += "</td>" ;

            ret += "<td>" ;
            ret += recent[i].lastopened.toString() ;
            ret += "</td>" ;

            ret += "</tr>" ;
        }
        ret += "</table>" ;
    }

    return ret ;
}

function computeCheckHtml() : string {
    let checkstr: string = "" ;
    if (MTBExtensionInfo.getMtbExtensionInfo().getPersistedBoolean(MTBExtensionInfo.showWelcomePageName, true)) {
        checkstr += "checked" ;
    }
    else {
        checkstr += "unchecked" ;
    }
    return checkstr ;
}

function computeKitHtml() : string {
    let ret: string = "<h2>Detecting ...</h2>" ;

    let mgr: MTBDevKitMgr | undefined = MTBExtensionInfo.getMtbExtensionInfo().getDevKitMgr() ;
    if (mgr) {
        ret = "" ;

        if (mgr.needsUpgrade()) {
            ret += "<h2>There are kits that need a firwmare upgrade.</h2>\n" ;
        }

        ret += '<table class="device-table">';
        ret += "<thead>";
        ret += "<tr>" ;
        ret += "<th>Name</th>" ;
        ret += "<th>Version</th>" ;
        ret += "<th>Mode</th>" ;
        ret += "<th>Serial Number</th>" ;
        ret += "<th>Firmware</th>" ;
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
                ret += '<td><a title="Update Firmware" class="dev-link" onclick="vscode.postMessage({ command: \'updatefirmware\', serial: \'' + kit.serial + '\'}) ;">Update Firmware</a></td>' ;
            }
            else {
                ret += "<td>OK</td>" ;
            }
            ret += "</tr>" ;
        }
        if (mgr.needsUpgrade()) {
            ret += "<tr>" ;
            ret += '<td colspan="5" class="upgrade-all">';
            ret += '<a class="dev-link" title="Update Firmware For All Devices" onclick="vscode.postMessage({ command: \'updateallfirmware\'});">Update Firmware For All Devices</a>' ;
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

    let uri: vscode.Uri = view.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, path1, path2));
    return uri;
}

function computeNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

function computeTab(tab: number | undefined) {
    let ret: string = "" ;
    if (tab) {
        ret = tab.toString() ;
    }

    return ret;
}

export function getModusToolboxAssistantHTMLPage(webview: vscode.Webview, page: string, tab: number | undefined) : string {

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

    let titlestr :string = 'ModusToolbox Assistant ' + MTBExtensionInfo.version;
    
    html = replaceTokens("####TITLE####", titlestr, html) ;
    html = replaceTokens("####RECENTS####", computeRecentHtml(), html) ;
    html = replaceTokens("####CHECKBOX####", computeCheckHtml(), html) ;
    html = replaceTokens("####DEVKITS####", computeKitHtml(), html) ;
    html = replaceTokens("####JSPATH####", createPath(webview, 'content', 'js').toString(), html) ;
    html = replaceTokens("####CSSPATH####", createPath(webview, 'content', 'css').toString(), html) ;
    html = replaceTokens("####CSPSOURCE####", webview.cspSource, html) ;
    html = replaceTokens("####NONCE####", computeNonce(), html) ;
    html = replaceTokens("####TAB####", computeTab(tab), html) ;

    // let file: string = "D:/cygwin64/home/bwg/src/mtbassist/stuff.html" ;
    // fs.writeFileSync(file, html) ;

    return html ;
}