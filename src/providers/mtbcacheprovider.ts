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

import * as vscode from 'vscode';

export enum MTBCacheLoc {
    WORKSPACE,
    GLOBAL
}

export class MTBCacheProvider {
    
    private static CACHE_ITEM_PREFIX = "mtbassist-cache-item-" ;
    private static CACHE_CLEAR_KEY = this.CACHE_ITEM_PREFIX + "clear-cache" ;

    private wState : vscode.Memento ;
    private gState : vscode.Memento ;

    private static cacheProvider : MTBCacheProvider | undefined = undefined ;

    constructor(context: vscode.ExtensionContext) {
        this.wState = context.workspaceState ;
        this.gState = context.globalState ;
    }

    private getState(cLoc:MTBCacheLoc) : vscode.Memento {
        let state : vscode.Memento ;
        switch (cLoc) {
            case MTBCacheLoc.GLOBAL :
                state = this.gState ;
                break;
            case MTBCacheLoc.WORKSPACE :
                state = this.wState ;
                break;
        }
        return state;
    }
    public getCacheItem(key:string, cLoc:MTBCacheLoc) : any {
        return this.getState(cLoc).get(MTBCacheProvider.CACHE_ITEM_PREFIX+key);
    }
    public async updateCacheItem(key:string, item:any, cLoc:MTBCacheLoc) {
        await this.getState(cLoc).update(MTBCacheProvider.CACHE_ITEM_PREFIX+key, item) ;
    }
    public async setFlagToClearCache(cLoc:MTBCacheLoc) {
        await this.getState(cLoc).update(MTBCacheProvider.CACHE_CLEAR_KEY, "true") ;
    }

    // When we clear the cache, we clear everything including the clear key itself
    private async clearCache(cLoc:MTBCacheLoc) {
        let state = this.getState(cLoc) ;
        for (const key of state.keys()) {
            if (key.startsWith(MTBCacheProvider.CACHE_ITEM_PREFIX)) {
                await state.update(key, undefined) ;
            }
        }    
    }

    public static async initMTBCacheProvider(context: vscode.ExtensionContext) {
        if (context === undefined) {
            throw new Error("Failed to initialize MTBCacheProvider, context is undefined!") ;
        }
        if (this.cacheProvider === undefined) {
            this.cacheProvider = new MTBCacheProvider(context) ;
        }
        // Check to see if a flag was set in the cache to clear it, if it was, we do this on init
        let clearWCache : string | undefined = this.cacheProvider.getState(MTBCacheLoc.WORKSPACE).get(MTBCacheProvider.CACHE_CLEAR_KEY)
        if (clearWCache != undefined && clearWCache == "true") {
            await this.cacheProvider.clearCache(MTBCacheLoc.WORKSPACE) ;
        }
        let clearGCache : string | undefined = this.cacheProvider.getState(MTBCacheLoc.GLOBAL).get(MTBCacheProvider.CACHE_CLEAR_KEY)
        if (clearGCache != undefined && clearGCache == "true") {
            await this.cacheProvider.clearCache(MTBCacheLoc.GLOBAL) ;
        }
    }

    public static getMTBCacheProvider() : MTBCacheProvider | undefined {
        if (this.cacheProvider === undefined) {
            throw new Error("Failed to getMTBCacheProvider, cache provider has not been initialized!")
        }
        return this.cacheProvider;
    }

}

