import fs = require('fs');
import path = require('path') ;
import { ExtensionContext } from "vscode";
import { getModusToolboxChannel, isDebugMode } from './mtbinfo';

let recentList : string[] = [] ;
const maxrecent: number = 5 ;
const recentfile: string = "recent.json" ;

export function getRecentList() : string [] {
    return recentList ;
}

export function readRecentList(context: ExtensionContext) {
    let stdir: string = context.globalStorageUri.fsPath ;
    try {
        let st = fs.statSync(stdir) ;
        if (!st) {
            if (isDebugMode()) {
                getModusToolboxChannel().appendLine("MtbAssist: debug: no recently opened list file exists") ;
            }
            return ;
        }
    }
    catch
    {
        if (isDebugMode()) {
            getModusToolboxChannel().appendLine("MtbAssist: debug: no recently opened list file exists") ;
        }        
        return ;
    }

    let stfile: string = path.join(stdir, recentfile) ;
    try {
        let st = fs.statSync(stfile) ;
        if (!st) {
            if (isDebugMode()) {
                getModusToolboxChannel().appendLine("MtbAssist: debug: no recently opened list file exists") ;
            }
            return ;
        }
    }
    catch
    {
        if (isDebugMode()) {
            getModusToolboxChannel().appendLine("MtbAssist: debug: no recently opened list file exists") ;
        }        
        return ;
    }

    let str : any = fs.readFileSync(stfile, "utf8") ;
    if (str) {
        let obj = JSON.parse(str) ;
        if (obj.projects !== undefined) {
            recentList = obj.projects ;
        }
    }

    if (isDebugMode()) {
        getModusToolboxChannel().appendLine("MtbAssist: debug: read " + recentList.length + " entries from recently opened list") ;
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
            getModusToolboxChannel().appendLine("MtbAssist: error: could not create extension storage directory '" + stdir + "'") ;            
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
        getModusToolboxChannel().appendLine("MtbAssist: error: could not write recently opened list '" + stfile + "'") ;            
        return ;
    }
}

export function addToRecentProjects(context: ExtensionContext, appdir: string) {
    let removing: boolean = true ;

    //
    // If it already exists in the list, remove it
    //
    while (removing) {
        let index: number = recentList.indexOf(appdir) ;
        if (index === -1) {
            removing = false ;
        }
        else {
            recentList.splice(index, 1) ;
        }
    }

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
