import { MTBExtensionInfo, MessageType } from "./mtbextinfo";
import open, { apps, openApp } from 'open' ;
import * as fs from 'fs' ;
import { pathToFileURL } from 'url' ;
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

function createJumpFile(url: string) : string {
    let template = `
    <!DOCTYPE html>
    <html>
        <script>
            function jump() {
                let file = "$$$TARGET$$$" ;
                window.location = file ;
            }
        </script>
        <body onload="jump()">
        </body>
    </html>
    ` ;

    let fragment = '' ;
    let index = url.indexOf('#') ;
    if (index !== -1) {
        fragment = url.substring(index) ;
        url = url.substring(0, index) ;
    }

    let u = pathToFileURL(url) + fragment ;
    let name: string = require('tmp').tmpNameSync({ postfix: ".html"});
    template = template.replace('$$$TARGET$$$', u.toString()) ;
    fs.writeFileSync(name, template) ;
    return pathToFileURL(name).toString() ;
}

export async function browseropen(url: string) {
    if (is_wsl) {
        if (wslinst === undefined) {
            wslinst = await findWSLInstance() ;
        }

        url = "file://wsl.localhost/" + wslinst + url ;
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "request to open document '" + url + "' is WSL");
        open(url) ;
    }
    else {
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.debug, "request to open document '" + url + "'");   
        let newurl: string = createJumpFile(url) ;
        openApp(apps.browser, { arguments: [newurl]}) ;
    }
}