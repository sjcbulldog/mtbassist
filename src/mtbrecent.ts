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

import fs = require('fs');
import path = require('path') ;
import { ExtensionContext } from "vscode";
import { MessageType, MTBExtensionInfo } from './mtbextinfo';

export interface RecentEntry {
    apppath: string ;
    lastopened: Date;
} ;

export class RecentAppManager {
    static readonly maxrecent: number = 5 ;
    static readonly recentfile: string = "recent.json" ;

    private recentList : RecentEntry[] = [] ;
    private changedCallbacks: (() => void)[] = [] ;

    public constructor() {
        this.readRecentList();
    }

    public addChangedCallback(cb: () => void) {
        if (this.changedCallbacks.indexOf(cb) === -1) {
            this.changedCallbacks.push(cb) ;
        }
    }    

    private findRecentEntryByPath(apppath: string) : number {
        let ret: number = -1 ;

        for(let index: number = 0 ; index < this.recentList.length ; index++) {
            if (this.recentList[index].apppath === apppath) {
                ret = index ;
                break ;
            }
        }

        return ret;
    }

    private removeFromRecentList(appdir: string) {
        let index: number = -1 ;
        let removed: boolean = false ;

        while ((index = this.findRecentEntryByPath(appdir)) !== -1) {
            this.recentList.splice(index, 1) ;
            removed = true ;
        }

        if (removed) {
            for(let cb of this.changedCallbacks) {
                (cb)() ;
            }
        }
    }

    public static checkRecent(apppath: string) : boolean {
        let ret: boolean = true ;

        try {
            let st = fs.statSync(apppath) ;
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

    public removeRecent(context: ExtensionContext, appdir: string) {
        appdir = path.normalize(appdir) ;
    
        this.removeFromRecentList(appdir) ;
        this.storeRecentList(context) ;
    }

    public getRecentList() : RecentEntry [] {
        return this.recentList ;
    }

    private assignRecentsList(obj: Object) {
        this.recentList = [] ;

        if (!Array.isArray(obj)) {
            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.warning, "the top level entry in the recents file is not an array");
        }
        else {
            let rarray: any[] = obj ;
            if (rarray.length > 0) {
                let entry = rarray[0] ;
                if (typeof entry === "string") {
                    //
                    // Old style recent file, array of strings
                    //
                    for(let appdir of rarray) {
                        if (typeof appdir === "string") {
                            let entry = {
                                apppath: appdir,
                                lastopened: new Date(0)
                            } ;
                            this.recentList.push(entry);
                        }
                    }
                }
                else {
                    this.recentList = rarray ;
                }
            }
        }
    }

    public readRecentList() {
        let stdir: string = MTBExtensionInfo.getMtbExtensionInfo().context.globalStorageUri.fsPath ;
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

        let stfile: string = path.join(stdir, RecentAppManager.recentfile) ;
        try {
            let st = fs.statSync(stfile) ;
            if (!st) {
                MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "no recently opened list file exists") ;
                return ;
            }
        }
        catch
        {
            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "no recently opened list file exists") ;      
            return ;
        }

        let str : any = fs.readFileSync(stfile, "utf8") ;
        if (str) {
            let obj = JSON.parse(str) ;
            if (obj.projects !== undefined) {
                this.assignRecentsList(obj.projects) ;
            }
        }

        if (this.recentList.length === 1) {
            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "Read 1 entry from recently opened list") ;
        }
        else {
            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "Read " + this.recentList.length + " entries from recently opened list") ;
        }

        for(let cb of this.changedCallbacks) {
            (cb)() ;
        }        
    }

    private storeRecentList(context: ExtensionContext) {
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
                MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "could not create extension storage directory '" + stdir + "'") ;            
                return ;
            }
        }

        let stfile: string = path.join(stdir, RecentAppManager.recentfile) ;
        let obj = { projects: this.recentList } ;
        let objstr = JSON.stringify(obj) ;

        try {
            fs.writeFileSync(stfile, objstr) ;
        }
        catch {
            MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "could not write recently opened list '" + stfile + "'") ;            
            return ;
        }
    }

    public addToRecentProjects(context: ExtensionContext, appdir: string) {
        let removing: boolean = true ;

        appdir = path.normalize(appdir) ;

        //
        // If it already exists in the list, remove it
        //
        this.removeFromRecentList(appdir) ;

        //
        // Now add the new element at the end, which is the location
        // of the most recent project
        //
        this.recentList.push({ apppath: appdir, lastopened: new Date() });

        //
        // If the most recent project list is too long, remove it
        //
        while (this.recentList.length > RecentAppManager.maxrecent) {
            this.recentList.shift() ;
        }

        for(let cb of this.changedCallbacks) {
            (cb)() ;
        }
        this.storeRecentList(context) ;
    }
}
