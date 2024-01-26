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

//
// This file is the main entry point for the ModusToolbox assistant extension.
// This file sets up the various commands and graphical elements of the extension
// to interact with the user.
//


import * as vscode from 'vscode';
import * as os from 'os' ;
import { getMTBProgramsTreeProvider } from './mtbprogramsprovider';
import { getMTBDocumentationTreeProvider } from './mtbdocprovider';
import { mtbTurnOffDebugMode, mtbTurnOnDebugMode, mtbShowWelcomePage, mtbCreateProject, mtbRunEditor, 
		mtbShowDoc, mtbResultDecode, mtbSymbolDoc, mtbRunLibraryManager, mtbRunMakeGetLibsCmd, mtbSetIntellisenseProject, mtbRefreshDevKits, mtbEPTAISearch } from './mtbcommands';
import path = require('path');
import fs = require('fs');
import { MessageType, MTBExtensionInfo } from './mtbextinfo';
import { mtbAssistLoadApp, getModusToolboxApp } from './mtbapp/mtbappinfo';
import { getMTBAssetProvider } from './mtbassetprovider';
import { getMTBProjectInfoProvider } from './mtbprojinfoprovider';
import { getModusToolboxAssistantHTMLPage } from './mtbgenhtml';

function getTerminalWorkingDirectory() : string {
	let ret: string = os.homedir() ;

	if (getModusToolboxApp()) {
		ret = getModusToolboxApp()!.appDir ;
	}

	return ret ;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	let disposable;

	//
	// Initialize the extension context.  This has all of the information needed for the
	// extension in one place and is a singleton.
	//
	MTBExtensionInfo.initExtension(context) ;

	MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "Starting ModusToolbox assistant");

	try {
		//
		// This eliminates issues with the life cycle of the clangd extension.
		//
		MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "Activating 'clangd' extension");
		await vscode.commands.executeCommand('clangd.activate');
	}
	catch(err) {
		let errobj: Error = (err as any) as Error ;
		MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.warning, "Cannot activate extension 'clangd' - " + errobj.message);
	}

	if (MTBExtensionInfo.getMtbExtensionInfo().major < 3) {
		// Put the message in the log window
		MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "This extension is designed for ModusToolbox 3.0 or later.  ModusToolbox 3.0 or later is not installed.");

		// Also tell the user via VS code messages
		vscode.window.showInformationMessage("This extension is designed for ModusToolbox 3.0 or later.  ModusToolbox 3.0 or later is not installed.");

		// Display a web page about ModusToolbox
		let panel : vscode.WebviewPanel = vscode.window.createWebviewPanel(
				 'mtbassist', 
				 'ModusToolbox', 
				 vscode.ViewColumn.One, 
				 {
					 enableScripts: true
				 }
			) ;

		panel.webview.html = getModusToolboxAssistantHTMLPage(panel.webview, 'notinstalled.html', undefined) ;
		return;
	}

	//
	// Register the various commands that are listed in the package.json file.
	//
	disposable = vscode.commands.registerCommand('mtbassist.mtbCreateProject', () => {
		mtbCreateProject(context);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbRunMakeGetlibs', () => {
		mtbRunMakeGetLibsCmd(context);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbRunEditor', (args: any[]) => {
		mtbRunEditor(context, args);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbShowDoc', (args: any[]) => {
		mtbShowDoc(context, args);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbShowWelcomePage', (args: any[]) => {
		mtbShowWelcomePage(context, 1);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbTurnOnDebugMode', (args: any[]) => {
		mtbTurnOnDebugMode(context);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbTurnOffDebugMode', (args: any[]) => {
		mtbTurnOffDebugMode(context);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerTextEditorCommand('mtbassist.mtbSymbolDoc', 
		(editor: vscode.TextEditor, edit: vscode.TextEditorEdit, args: any[]) => {
			mtbSymbolDoc(editor, edit, context);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbResultDecode', (args: any[]) => {
		mtbResultDecode(context);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbRunLibraryManager', (args: any[]) => {
		mtbRunLibraryManager(context);
	});
	context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('mtbassist.mtbSetIntellisenseProject', (args: any[]) => {
        mtbSetIntellisenseProject(context) ;
    });

    disposable = vscode.commands.registerCommand('mtbassist.mtbRefreshDevKits', (args: any[]) => {
        mtbRefreshDevKits(context) ;
    });

    disposable = vscode.commands.registerCommand('mtbassist.mtbEPTAISearch', (args: any[]) => {
        mtbEPTAISearch(context) ;
    });	

	//
	// Set the tree providers for general information about the ModusToolbox project
	//
	vscode.window.createTreeView('mtbprojinfo',
		{
			treeDataProvider: getMTBProjectInfoProvider()
		});

	//
	// Set the tree providers for the programs that can be invoked from ModusToolbox
	//
	vscode.window.createTreeView('mtbglobal',
		{
			treeDataProvider: getMTBProgramsTreeProvider()
		});

	//
	// Set the tree provider for the documentation that can be loaded
	//
	vscode.window.createTreeView('mtbdocs',
		{
			treeDataProvider: getMTBDocumentationTreeProvider()
		});

	//
	// Set the tree provider for the documentation that can be loaded
	//
	vscode.window.createTreeView('mtbassets',
		{
			treeDataProvider: getMTBAssetProvider()
		});

	//
	// If a foler is located already, load the information to see if it is
	// relevant to this extension
	//
	let appdir = undefined;
	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		appdir = vscode.workspace.workspaceFolders[0].uri.fsPath;
	}

	// Note: if the appdir is undefined, this means no actual folder is being loaded.  In this case
	// loading the application sets up the tree providers to show the state of no application loaded
	mtbAssistLoadApp(context, appdir)
		.then((status) => {
			let shpath = path.join(MTBExtensionInfo.getMtbExtensionInfo().toolsDir, "modus-shell/bin/bash") ;
			if (process.platform === "win32") {
				shpath += ".exe" ;
			}

			vscode.window.registerTerminalProfileProvider('mtbassist.mtbShell', {
				provideTerminalProfile(token: vscode.CancellationToken) : vscode.ProviderResult<vscode.TerminalProfile> {
					return {
						options : {
							name: "ModusToolbox Shell",
							shellPath: shpath,
							shellArgs: ["--login"],
							cwd: getTerminalWorkingDirectory(),
							env: {
								["HOME"] : os.homedir(),
								["PATH"] : "/bin:/usr/bin",
								["TEMP"] : "/tmp",
								["TMP"] : "/tmp",
								["CHERE_INVOKING"] : getTerminalWorkingDirectory()
							},
							strictEnv: false,
							message: "Welcome To ModusToolbox Shell",	
						}
					} ;
				}
			}) ;			
		})
		.catch((err) => {
		}) ;

	// Show the user the ModusToolbox assistant welcom page
	if (MTBExtensionInfo.getMtbExtensionInfo().getPersistedBoolean(MTBExtensionInfo.showWelcomePageName, true)) {
		vscode.commands.executeCommand('mtbassist.mtbShowWelcomePage');
	}


}

// this method is called when your extension is deactivated
export function deactivate() {
}
