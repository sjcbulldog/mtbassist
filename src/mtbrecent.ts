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

import fs = require('fs');
import path = require('path') ;
import { ExtensionContext } from "vscode";
import { MessageType, MTBExtensionInfo } from './mtbextinfo';

let recentList : string[] = [] ;
const maxrecent: number = 5 ;
const recentfile: string = "recent.json" ;

function removeFromRecentList(appdir: string) {
    let removing: boolean = true ;
    while (removing) {
        let index: number = recentList.indexOf(appdir) ;
        if (index === -1) {
            removing = false ;
        }
        else {
            recentList.splice(index, 1) ;
        }
    }    
}

export function checkRecent(appdir: string) : boolean {
    let ret: boolean = true ;

    try {
        let st = fs.statSync(appdir) ;
        if (!st.isDirectory()) {
            ret = false ;
        }
    }
    catch
    {
        ret = false ;
    }
    return ret ;
}

export function removeRecent(context: ExtensionContext, appdir: string) {
    appdir = path.normalize(appdir) ;
    
    removeFromRecentList(appdir) ;
    storeRecentList(context) ;
}

export function getRecentList() : string [] {
    return recentList ;
}

export function readRecentList(context: ExtensionContext) {
    let stdir: string = context.globalStorageUri.fsPath ;
    try {
        let st = fs.statSync(stdir) ;
        if (!st) {
            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "no recently opened list file exists") ;
            return ;
        }
    }
    catch
    {
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "no recently opened list file exists") ; ;
    }

    let stfile: string = path.join(stdir, recentfile) ;
    try {
        let st = fs.statSync(stfile) ;
        if (!st) {
            MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.debug, "no recently opened list file exists") ;
            return ;
        }
    }
    catch
    {
        MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.debug, "no recently opened list file exists") ;      
        return ;
    }

    let str : any = fs.readFileSync(stfile, "utf8") ;
    if (str) {
        let obj = JSON.parse(str) ;
        if (obj.projects !== undefined) {
            recentList = obj.projects ;
        }
    }

    if (recentList.length === 1) {
        MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.debug, "Read 1 entry from recently opened list") ;
    }
    else {
        MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.debug, "Read " + recentList.length + " entries from recently opened list") ;
    }
}

function storeRecentList(context: ExtensionContext) {
    let stdir: string = context.globalStorageUri.fsPath ;
    let st ;

    try {
        st = fs.statSync(stdir) ;
    }
    catch {
        fs.mkdirSync(stdir) ;
        try {
            st = fs.statSync(stdir) ;
        }
        catch {
            //
            // If we cannot create the directory, we don't fail horribly we just
            // don't support the recently created list.
            //
            MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.error, "could not create extension storage directory '" + stdir + "'") ;            
            return ;
        }
    }

    let stfile: string = path.join(stdir, recentfile) ;
    let obj = { projects: recentList } ;
    let objstr = JSON.stringify(obj) ;

    try {
        fs.writeFileSync(stfile, objstr) ;
    }
    catch {
        MTBExtensionInfo.getMtbExtensionInfo(context).logMessage(MessageType.error, "could not write recently opened list '" + stfile + "'") ;            
        return ;
    }
}

export function addToRecentProjects(context: ExtensionContext, appdir: string) {
    let removing: boolean = true ;

    appdir = path.normalize(appdir) ;

    //
    // If it already exists in the list, remove it
    //
    removeFromRecentList(appdir) ;

    //
    // Now add the new element at the end, which is the location
    // of the most recent project
    //
    recentList.push(appdir) ;

    //
    // If the most recent project list is too long, remove it
    //
    while (recentList.length > maxrecent) {
        recentList.shift() ;
    }

    storeRecentList(context) ;
}
