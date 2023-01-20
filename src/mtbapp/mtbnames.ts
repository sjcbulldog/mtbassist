//
// Copyright 2022 by C And T Software
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

export class ModusToolboxEnvVarNames
{
    static readonly MTB_DEVICE: string = "MTB_DEVICE" ; 
    static readonly MTB_TOOLCHAIN: string = "MTB_TOOLCHAIN" ;
    static readonly MTB_TARGET: string = "MTB_TARGET" ;
    static readonly MTB_COMPONENTS: string = "MTB_COMPONENTS";
    static readonly MTB_DISABLED_COMPONENTS: string = "MTB_DISABLED_COMPONENTS";
    static readonly MTB_ADDITIONAL_DEVICES: string = "MTB_ADDITIONAL_DEVICES";
    static readonly MTB_LIBS: string = "MTB_LIBS";
    static readonly MTB_DEPS: string = "MTB_DEPS";
    static readonly MTB_WKS_SHARED_NAME: string = "MTB_WKS_SHARED_NAME";
    static readonly MTB_WKS_SHARED_DIR: string = "MTB_WKS_SHARED_DIR";
    static readonly MTB_TOOLS_DIR: string = "MTB_TOOLS_DIR";
    static readonly MTB_APP_NAME: string = "MTB_APP_NAME";
    static readonly MTB_CACHE_DIR: string = "MTB_CACHE_DIR";
    static readonly MTB_OFFLINE_DIR: string = "MTB_OFFLINE_DIR";
    static readonly MTB_GLOBAL_DIR: string = "MTB_GLOBAL_DIR";
    static readonly MTB_TYPE: string = "MTB_TYPE" ;
    static readonly MTB_PROTOCOL: string = "MTB_PROTOCOL" ;
    static readonly MTB_PROJECTS: string = "MTB_PROJECTS" ;
    static readonly MTB_CORE_TYPE: string = "MTB_CORE_TYPE" ;
    static readonly MTB_CORE_NAME: string = "MTB_CORE_NAME" ;
}

export class ModusToolboxEnvTypeNames
{
    static readonly COMBINED = "COMBINED" ;
    static readonly APPLICATION = "APPLICATION" ;
    static readonly PROJECT = "PROJECT" ;
}