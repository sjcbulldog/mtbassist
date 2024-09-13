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
import { getMTBProgramsTreeProvider } from './providers/mtbprogramsprovider';
import { getMTBQuickLinksTreeProvider } from './providers/mtbquicklinkprovider';
import { getMTBDocumentationTreeProvider, getNoMTBDocumentationTreeProvider } from './providers/mtbdocprovider';
import { mtbTurnOffDebugMode, mtbTurnOnDebugMode, mtbShowWelcomePage, mtbCreateProject, mtbRunEditor, mtbAddTasks, mtbShowDoc, 
		 mtbResultDecode, mtbSymbolDoc, mtbRunLibraryManager, mtbRunMakeGetLibsCmd, mtbSetIntellisenseProject, mtbRefreshDevKits, 
		 mtbTurnOnCodeExampleReadme, mtbTurnOffCodeExampleReadme, 
		 mtbTurnOnExperimentalNinaSUpport,
		 mtbTurnOffExperimentalNinaSUpport} from './mtbcommands';
import path = require('path');
import fs = require('fs');
import { MessageType, MTBExtensionInfo } from './mtbextinfo';
import { mtbAssistLoadApp, getModusToolboxApp, MTBAppInfo } from './mtbapp/mtbappinfo';
import { getMTBAssetProvider } from './providers/mtbassetprovider';
import { getMTBProjectInfoProvider } from './providers/mtbprojinfoprovider';
import { getModusToolboxAssistantHTMLPage } from './mtbgenhtml';

function getTerminalWorkingDirectory() : string {
	let ret: string = os.homedir() ;

	if (getModusToolboxApp()) {
		ret = getModusToolboxApp()!.appDir ;
	}

	return ret ;
}

function modusToolboxNotInstalled() {
	let opts = {
		modal: true
	} ;
	vscode.window.showErrorMessage("ModusToolbox 3.0 or later is not installed.  Please install ModusToolbox 3.0 or later and try again.", opts) ;
}

function noModusToolbox(context: vscode.ExtensionContext) {
	let disposable;

	//
	// Register the various commands that are listed in the package.json file.
	//
	disposable = vscode.commands.registerCommand('mtbassist.mtbCreateProject', () => {
		modusToolboxNotInstalled();
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbRunMakeGetlibs', () => {
		modusToolboxNotInstalled();
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbRunEditor', (args: any[]) => {
		modusToolboxNotInstalled();
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbShowDoc', (args: any[]) => {
		mtbShowDoc(context, args);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbShowWelcomePage', (args: any[]) => {
		modusToolboxNotInstalled();
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbTurnOnExperimentalNina', (args: any[]) => {
		modusToolboxNotInstalled();
	});
	context.subscriptions.push(disposable);	

	disposable = vscode.commands.registerCommand('mtbassist.mtbTurnOffExperimentalNina', (args: any[]) => {
		modusToolboxNotInstalled();
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
			modusToolboxNotInstalled();
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbResultDecode', (args: any[]) => {
		modusToolboxNotInstalled();
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbRunLibraryManager', (args: any[]) => {
		modusToolboxNotInstalled();
	});
	context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('mtbassist.mtbSetIntellisenseProject', (args: any[]) => {
		modusToolboxNotInstalled();
    });

    disposable = vscode.commands.registerCommand('mtbassist.mtbRefreshDevKits', (args: any[]) => {
		modusToolboxNotInstalled();
    });	

	disposable = vscode.commands.registerCommand('mtbassist.mtbAddTasks', (args: any[]) => {
		modusToolboxNotInstalled();
    });	

	vscode.window.createTreeView('mtbdocs',
		{
			treeDataProvider: getNoMTBDocumentationTreeProvider()
		});	
}

function findWorkspaceFile() : string | null {
	let ret: string | null = null ;
	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
		let files = fs.readdirSync(vscode.workspace.workspaceFolders![0].uri.fsPath) ;
		for(let file of files) {
			if (file.endsWith(".code-workspace")) {
				ret = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, file) ;
				break ;
			}
		}
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

	if (!MTBExtensionInfo.getMtbExtensionInfo().isModusToolboxValid) {
		noModusToolbox(context) ;

		// Put the message in the log window
		MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.error, "This extension is designed for ModusToolbox 3.0 or later.  ModusToolbox 3.0 or later is not installed.");

		// Also tell the user via VS code messages
		const minfo = "More Information" ;
		vscode.window.showInformationMessage("This extension is designed for ModusToolbox 3.0 or later.  ModusToolbox 3.0 or later is not installed.", minfo)
			.then(selection => {
				if (selection === minfo) {
					vscode.env.openExternal(vscode.Uri.parse("https://softwaretools.infineon.com/tools/com.ifx.tb.tool.modustoolboxsetup")) ;
				}
			}) ;

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

	disposable = vscode.commands.registerCommand('mtbassist.mtbTurnOnExperimentalNina', (args: any[]) => {
		mtbTurnOnExperimentalNinaSUpport(context);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbTurnOffExperimentalNina', (args: any[]) => {
		mtbTurnOffExperimentalNinaSUpport(context);
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
		mtbShowWelcomePage(context, 0);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbTurnOnCodeExampleReadme', (args: any[]) => {
		mtbTurnOnCodeExampleReadme(context);
	});
	context.subscriptions.push(disposable);    

	disposable = vscode.commands.registerCommand('mtbassist.mtbTurnOffCodeExampleReadme', (args: any[]) => {
		mtbTurnOffCodeExampleReadme(context);
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

    disposable = vscode.commands.registerCommand('mtbassist.mtbAddTasks', (args: any[]) => {
        mtbAddTasks(context) ;
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
	vscode.window.createTreeView('mtblinks',
		{
			treeDataProvider: getMTBQuickLinksTreeProvider()
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
	if (vscode.workspace.workspaceFolders) {
		if (vscode.workspace.workspaceFolders.length === 1) {
			let wspace = findWorkspaceFile() ;
			if (wspace) {
				//
				// Force a reload of the workspace file and not the folder that contains the MTB project
				//
                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(wspace)) ;				
			}
			else {
				appdir = vscode.workspace.workspaceFolders[0].uri.fsPath ;
			}
		}
		else {
			appdir = vscode.workspace.workspaceFolders[0].uri.fsPath;
		}
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
                            isTransient: true,
							env: {
								["HOME"] : os.homedir(),
								["PATH"] : "/bin:/usr/bin",
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
