import * as vscode from 'vscode';
import { MTBAppInfo, getModusToolboxApp } from './mtbapp/mtbappinfo';

export function mtbCreateNinjaBuildFile(context: vscode.ExtensionContext) {
    let app: MTBAppInfo | undefined = getModusToolboxApp() ;
    if (app === undefined) {
        vscode.window.showInformationMessage("No ModusToolbox Application Loaded") ;
        return ;
    }

    for(var proj : app.projects) {

    }
}
