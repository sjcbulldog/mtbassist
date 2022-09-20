// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { MTBAssistGlobalProvider } from './mtbglobal';
import { MTBAssistDocumentProvider } from './mtbdoc';
import { mtbCreateProject, mtbImportProject, mtbRunEditor, mtbShowDoc } from './mtbcommands';
import path = require('path');
import fs = require('fs') ;
import { getMTBDocumentationTreeProvider, getMTBProgramsTreeProvider, initMtbInfo } from './mtbinfo';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Find the tools directory.  We may re-initialize later if we find a project
	initMtbInfo(context) ;
	
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('mtbassist.mtbCreateProject', () => {
		mtbCreateProject(context) ;
	});

	disposable = vscode.commands.registerCommand('mtbassist.mtbImportProject', () => {
		mtbImportProject(context) ;
	});

	disposable = vscode.commands.registerCommand('mtbassist.mtbRunEditor', (args: any[]) => {
		mtbRunEditor(args) ;
	});

	disposable = vscode.commands.registerCommand('mtbassist.mtbShowDoc', (args: any[]) => {
		mtbShowDoc(args) ;
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
}

// this method is called when your extension is deactivated
export function deactivate() {
}
