// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getMTBProgramsTreeProvider, MTBAssistGlobalProvider } from './mtbglobal';
import { getMTBDocumentationTreeProvider, MTBAssistDocumentProvider } from './mtbdoc';
import { mtbShowWelcomePage, mtbCreateProject, mtbImportProject, mtbRunEditor, mtbShowDoc } from './mtbcommands';
import path = require('path');
import fs = require('fs') ;
import open = require("open") ;
import { readRecentList } from './mtbrecent';
import { getModusToolboxAssistantStartupHtml } from './mtbstart';
import { MessageType, mtbAssistExtensionInfo } from './mtbextinfo';
import { MTBAppInfo, mtbAssistLoadApp } from './mtbappinfo';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	mtbAssistExtensionInfo.showMessageWindow() ;
	mtbAssistExtensionInfo.logMessage(MessageType.info, "Starting ModusToolbox assistant") ;

	if (!mtbAssistExtensionInfo.isVersionOk) {
		// Put the message in the log window
		mtbAssistExtensionInfo.showMessageWindow() ;
		mtbAssistExtensionInfo.logMessage(MessageType.error, "This extension is designed for ModusToolbox 3.0 or later.  ModusToolbox 3.0 or later is not installed.") ;

		// Also tell the user via VS code messages
		vscode.window.showInformationMessage("This extension is designed for ModusToolbox 3.0 or later.  ModusToolbox 3.0 or later is not installed.") ;
		return ;
	}

	let folders = vscode.workspace.workspaceFolders ;
	let appdir = undefined ;
	let disposable ;

	// Find the tools directory.  We may re-initialize later if we find a project
	if (folders && folders.length > 0) {
		appdir = folders[0].uri.fsPath ;
	}

	mtbAssistLoadApp(appdir) ;
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

	vscode.commands.executeCommand('mtbassist.mtbShowWelcomePage') ;
}

// this method is called when your extension is deactivated
export function deactivate() {
}
