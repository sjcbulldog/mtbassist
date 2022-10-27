///
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

import { ModusToolboxEnvVarNames } from "./mtbnames";
import { MTBAppInfo } from "./mtbappinfo";
import { MTBAssetInstance } from "./mtbassets";
import { getMTBAssetProvider } from "../mtbassetprovider";

export class MTBProjectInfo
{
    // The app that owns this project
    public app : MTBAppInfo ;

    public name: string ;
        
    // The shared directory
    public sharedDir?: string ;

    // The libs directory
    public libsDir?: string ;

    // The deps directory
    public depsDir?: string ;

    // The global directory
    public globalDir?: string ;

    // The list of assets
    public assets: MTBAssetInstance[] ;

    // The list of vars from the make get_app_info
    mtbvars: Map<string, string> = new Map<string, string>() ;
        
    static oldVarMap: Map<string, string> = new Map<string, string>() ;

    constructor(app: MTBAppInfo, name: string) {
        this.app = app ;
        this.name = name ;
        this.assets = [] ;
        
        if (MTBProjectInfo.oldVarMap.size === 0) {
            MTBProjectInfo.initOldVarMap() ;
        }
    }

    public getVar(varname: string) : string | undefined {
        return this.mtbvars.get(varname) ;
    }

    public updateAssets() {
        getMTBAssetProvider().refresh(this.name, this.assets) ;
    }

    static initOldVarMap() {
        MTBProjectInfo.oldVarMap.set("TARGET_DEVICE", ModusToolboxEnvVarNames.MTB_DEVICE);
        MTBProjectInfo.oldVarMap.set("TOOLCHAIN", ModusToolboxEnvVarNames.MTB_TOOLCHAIN);
        MTBProjectInfo.oldVarMap.set("TARGET", ModusToolboxEnvVarNames.MTB_TARGET);
        MTBProjectInfo.oldVarMap.set("COMPONENTS", ModusToolboxEnvVarNames.MTB_COMPONENTS);
        MTBProjectInfo.oldVarMap.set("DISABLE_COMPONENTS", ModusToolboxEnvVarNames.MTB_DISABLED_COMPONENTS);
        MTBProjectInfo.oldVarMap.set("ADDITIONAL_DEVICES", ModusToolboxEnvVarNames.MTB_ADDITIONAL_DEVICES);
        MTBProjectInfo.oldVarMap.set("CY_GETLIBS_PATH", ModusToolboxEnvVarNames.MTB_LIBS);
        MTBProjectInfo.oldVarMap.set("CY_GETLIBS_DEPS_PATH", ModusToolboxEnvVarNames.MTB_DEPS);
        MTBProjectInfo.oldVarMap.set("CY_GETLIBS_SHARED_NAME", ModusToolboxEnvVarNames.MTB_WKS_SHARED_NAME);
        MTBProjectInfo.oldVarMap.set("CY_GETLIBS_SHARED_PATH", ModusToolboxEnvVarNames.MTB_WKS_SHARED_DIR);
        MTBProjectInfo.oldVarMap.set("CY_TOOLS_PATH", ModusToolboxEnvVarNames.MTB_TOOLS_DIR);
        MTBProjectInfo.oldVarMap.set("APP_NAME", ModusToolboxEnvVarNames.MTB_APP_NAME);
        MTBProjectInfo.oldVarMap.set("CY_GETLIBS_CACHE_PATH", ModusToolboxEnvVarNames.MTB_CACHE_DIR);
        MTBProjectInfo.oldVarMap.set("CY_GETLIBS_OFFLINE_PATH", ModusToolboxEnvVarNames.MTB_OFFLINE_DIR);
        MTBProjectInfo.oldVarMap.set("CY_GETLIBS_GLOBAL_PATH", ModusToolboxEnvVarNames.MTB_GLOBAL_DIR);
    }
}
