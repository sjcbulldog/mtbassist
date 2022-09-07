// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { MTBAssistGlobalProvider } from './mtbglobal';
import { MTBAssistDocumentProvider } from './mtbdoc';
import { mtbCreateProject } from './mtbcommands';
import { mtbImportProject } from './mtbcommands';
import { mtbRunEditor } from './mtbcommands' ;
import path = require('path');
import fs = require('fs') ;
import { getMTBDocumentationTreeProvider, getMTBProgramsTreeProvider, initMtbInfo } from './mtbinfo';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Find the tools directory.  We may re-initialize later if we find a project
	initMtbInfo() ;
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "mtbassist" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('mtbassist.mtbCreateProject', () => {
		mtbCreateProject() ;
	});

	disposable = vscode.commands.registerCommand('mtbassist.mtbImportProject', () => {
		mtbImportProject() ;
	});

	disposable = vscode.commands.registerCommand('mtbassist.mtbRunEditor', (args: any[]) => {
		mtbRunEditor(args) ;
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
				initMtbInfo(folder.uri.fsPath) ;
			}
		}) ;
	}
}

// this method is called when your extension is deactivated
export function deactivate() {

}
