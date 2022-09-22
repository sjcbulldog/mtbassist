// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { MTBAssistGlobalProvider } from './mtbglobal';
import { MTBAssistDocumentProvider } from './mtbdoc';
import { mtbShowWelcomePage, mtbCreateProject, mtbImportProject, mtbRunEditor, mtbShowDoc } from './mtbcommands';
import path = require('path');
import fs = require('fs') ;
import { checkModusToolboxVersion, getDocsLocation, getModusToolboxChannel, getMTBDocumentationTreeProvider, getMTBProgramsTreeProvider, initMtbInfo, isDebugMode } from './mtbinfo';
import open = require("open") ;
import { readRecentList } from './mtbrecent';
import { getModusToolboxAssistantStartupHtml } from './mtbstart';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	if (!checkModusToolboxVersion(context)) {
		vscode.window.showInformationMessage("This extension is designed for ModusToolbox 3.0 or later.  ModusToolbox 3.0 or later is not installed.")
		return ;
	}

	let folders = vscode.workspace.workspaceFolders ;
	let appdir = undefined ;
	let disposable ;

	// Find the tools directory.  We may re-initialize later if we find a project
	if (folders && folders.length > 0) {
		appdir = folders[0].uri.fsPath ;
	}

	initMtbInfo(context, appdir) ;

	if (isDebugMode()) {
		getModusToolboxChannel().appendLine("MtbAssistant: running in debug mode") ;
	}

	readRecentList(context) ;
	
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	disposable = vscode.commands.registerCommand('mtbassist.mtbCreateProject', () => {
		mtbCreateProject(context) ;
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbImportProject', () => {
		mtbImportProject(context) ;
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbRunEditor', (args: any[]) => {
		mtbRunEditor(args) ;
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbShowDoc', (args: any[]) => {
		mtbShowDoc(args) ;
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('mtbassist.mtbShowWelcomePage', (args: any[]) => {
		mtbShowWelcomePage(context) ;
	});
	context.subscriptions.push(disposable);

	vscode.window.createTreeView('mtbglobal', 
	{
		treeDataProvider: getMTBProgramsTreeProvider()
	}) ;

	vscode.window.createTreeView('mtbdocs',
	{
		treeDataProvider: getMTBDocumentationTreeProvider()
	}) ;

	if (vscode.workspace.workspaceFolders) {
		vscode.workspace.workspaceFolders.forEach((folder) => {
			let mkpath : string = path.join(folder.uri.fsPath, "Makefile") ;
			if (fs.existsSync(mkpath)) {
				initMtbInfo(context, folder.uri.fsPath) ;
			}
		}) ;
	}

	vscode.commands.executeCommand('mtbassist.mtbShowWelcomePage') ;
}

// this method is called when your extension is deactivated
export function deactivate() {
}
