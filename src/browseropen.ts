import { ChildProcess } from "child_process";
import { MTBExtensionInfo, MessageType } from "./mtbextinfo";

import open from 'open' ;
const is_wsl = require('is-wsl');

let wslinst: string | undefined = undefined ;

async function findWSLInstance() : Promise<string> {
    let ret: Promise<string> = new Promise<string>((resolve, reject) => {
        let name: string = "" ;
        if (process.env["WSL_DISTRO_NAME"] !== undefined) {
            name = process.env["WSL_DISTRO_NAME"] ;
        }
        resolve(name) ;
    }) ;

    return ret;
}

export async function browseropen(url: string) {
    if (is_wsl) {
        if (wslinst === undefined) {
            wslinst = await findWSLInstance() ;
        }

        url = "file://wsl.localhost/" + wslinst + url ;
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "request to open document '" + url + "' is WSL");
        open(url);
    }
    else {
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "request to open document '" + url + "'");        
        open(url);
    }
}