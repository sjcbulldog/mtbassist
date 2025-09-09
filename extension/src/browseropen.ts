/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

    if (purl.scheme === 'http' || purl.scheme === 'https' || purl.scheme === 'file') {
        vscode.env.openExternal(purl) ;
    }
    else {
        let newurl: string = createJumpFile(url) ;    
        openApp(apps.browser, { arguments: [newurl]}) ;
    }
}