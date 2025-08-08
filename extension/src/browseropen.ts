import { apps, openApp } from 'open' ;
import { pathToFileURL } from 'url' ;
import * as fs from 'fs' ;
import * as vscode from 'vscode';

let wslinst: string | undefined = undefined ;

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
    let purl = vscode.Uri.parse(url) ;

    if (purl.scheme === 'http' || purl.scheme === 'https') {
        vscode.env.openExternal(purl) ;
    }
    else {
        let newurl: string = createJumpFile(url) ;    
        openApp(apps.browser, { arguments: [newurl]}) ;
    }
}