///
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

import * as path from 'path' ;
import * as exec from 'child_process' ;

import { MessageType, MTBExtensionInfo } from '../mtbextinfo';
import { ModusToolboxEnvVarNames } from './mtbnames';
import exp = require('constants');
import { mtbStringToJSON } from '../mtbjson';

//
// This runs a command using the modus shell.  If any output appears on standard error, it is output
// to the log window
//
// Args:
//   cmd - the command to run
//   
// Returns:
//    the output from running the command
//
export function runModusCommandThroughShell(cmd: string, cwd: string) : Promise<string> {
    let ret : Promise<string> = new Promise<string>( (resolve, reject) => {
        let makepath : string = path.join(MTBExtensionInfo.getMtbExtensionInfo().toolsDir, "modus-shell", "bin", "bash") ;
        if (process.platform === "win32") {
            makepath += ".exe" ;
        }

        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "running ModusToolbox command '" + cmd + "' in directory '" + cwd + "'") ;
        let cmdstr: string ;
        if (process.platform === 'win32') {
            cmdstr = "PATH=/bin:/usr/bin ; " + cmd ;
        }
        else {
            cmdstr = cmd ;
        }
        
        exec.execFile(makepath, ["-c", cmdstr], { cwd: cwd }, (error, stdout, stderr) => {
            if (error) {
                let errmsg : Error = error as Error ;
                MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "running command '" + cmd + "' - " + errmsg.message) ;
                reject([error, stdout, stderr]) ;
            }

            if (stderr) {
                let lines: string[] = stderr.split("\n") ;
                MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "error output from running command '" + cmd + "'") ;
                for(let i : number = 0 ; i < lines.length ; i++) {
                    if (lines[i].length > 0) {
                        let msg: string = (i + 1).toString() + ": " + lines[i] ;
                        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, msg) ;
                    }
                }
            }

            resolve(stdout) ;
        }) ;
    }) ;

    return ret ;
}

export function runMakeVSCode(cwd: string) : Promise<void> {
    let ret = new Promise<void>((resolve, reject) => {
        runModusCommandThroughShell("make vscode", cwd)
            .then ((output: string) => {
                resolve() ;
            })
            .catch ((info) => {
                let error = info[0] ;
                let stdout = info[1] ;
                let stderr = info[2] ;
                reject(info) ;
            }) ;
    }) ;
    return ret ;
}

let oldVarMap: Map<string, string> = new Map<string, string>() ;

export function mapOldToNew(old: Map<string, string>) : Map<string, string> {
    let ret: Map<string, string> = new Map<string, string>() ;
    if (oldVarMap.size === 0) {
        initOldVarMap() ;
    }

    for(let [key, value] of old) {
        if (oldVarMap.has(key)) {
            key = oldVarMap.get(key) as string ;
        }

        if (key.startsWith("MTB_")) {
            ret.set(key, value) ;
        }
    }
    return ret ;
}
        
function initOldVarMap() {
    oldVarMap.set("TARGET_DEVICE", ModusToolboxEnvVarNames.MTB_DEVICE);
    oldVarMap.set("TOOLCHAIN", ModusToolboxEnvVarNames.MTB_TOOLCHAIN);
    oldVarMap.set("TARGET", ModusToolboxEnvVarNames.MTB_TARGET);
    oldVarMap.set("COMPONENTS", ModusToolboxEnvVarNames.MTB_COMPONENTS);
    oldVarMap.set("DISABLE_COMPONENTS", ModusToolboxEnvVarNames.MTB_DISABLED_COMPONENTS);
    oldVarMap.set("ADDITIONAL_DEVICES", ModusToolboxEnvVarNames.MTB_ADDITIONAL_DEVICES);
    oldVarMap.set("CY_GETLIBS_PATH", ModusToolboxEnvVarNames.MTB_LIBS);
    oldVarMap.set("CY_GETLIBS_DEPS_PATH", ModusToolboxEnvVarNames.MTB_DEPS);
    oldVarMap.set("CY_GETLIBS_SHARED_NAME", ModusToolboxEnvVarNames.MTB_WKS_SHARED_NAME);
    oldVarMap.set("CY_GETLIBS_SHARED_PATH", ModusToolboxEnvVarNames.MTB_WKS_SHARED_DIR);
    oldVarMap.set("CY_TOOLS_PATH", ModusToolboxEnvVarNames.MTB_TOOLS_DIR);
    oldVarMap.set("APP_NAME", ModusToolboxEnvVarNames.MTB_APP_NAME);
    oldVarMap.set("CY_GETLIBS_CACHE_PATH", ModusToolboxEnvVarNames.MTB_CACHE_DIR);
    oldVarMap.set("CY_GETLIBS_OFFLINE_PATH", ModusToolboxEnvVarNames.MTB_OFFLINE_DIR);
    oldVarMap.set("CY_GETLIBS_GLOBAL_PATH", ModusToolboxEnvVarNames.MTB_GLOBAL_DIR);
    oldVarMap.set("CY_PROTOCOL", ModusToolboxEnvVarNames.MTB_PROTOCOL) ;
}

function makeOutputToMap(output: string) : Map<string, string> {
    let ret : Map<string, string> = new Map<string, string>() ;
    let lines: string[] = output.split('\n') ;
    for(var line of lines) {
        let index = line.indexOf('=') ;
        if (index !== -1) {
            let name: string = line.substring(0, index) ;
            let value: string = line.substring(index + 1) ;
            ret.set(name, value) ;
        }
    }
    return mapOldToNew(ret) ;
}

export function runMakeGetAppInfo(cwd: string) : Promise<Map<string, string>> {
    let ret = new Promise<Map<string, string>>((resolve, reject) => {
        runModusCommandThroughShell("make CY_PROTOCOL=2 MTB_QUERY=1 get_app_info", cwd)
            .then ((output: string) => {
                let outmap : Map<string, string> = makeOutputToMap(output) ;
                resolve(outmap) ;
            })
            .catch ((info) => {
                let error = info[0] ;
                let stdout = info[1] ;
                let stderr = info[2] ;
                reject(error) ;
            }) ;
    }) ;
    return ret ;
}

//
// Run the mtb launch application and return the output when it is done.  The output is
// json text.
//
export function runMtbLaunch(cwd: string) : Promise<any> {
    let ret = new Promise<any>( (resolve, reject) => {
        let mtblaunch = path.join(MTBExtensionInfo.getMtbExtensionInfo().toolsDir, "mtblaunch", "mtblaunch") ;
        if (process.platform === "win32") {
            mtblaunch += ".exe" ;
        }
        mtblaunch += " --quick --docs --app "  + cwd ;

        exec.exec(mtblaunch, { cwd: cwd, windowsHide: true }, (error, stdout, stderr) => {
            if (error) {
                reject(error) ;
            }
    
            if (stderr) {
                MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "mtblaunch: " + stderr) ;
            }
            
            let obj = mtbStringToJSON(stdout) ;
            resolve(obj) ;
        }) ;
    }) ;

    return ret ;
}