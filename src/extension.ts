// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { MTBAssistGlobalProvider } from './mtbglobal';
import { MTBAssistDocumentProvider } from './mtbdoc';
import { mtbCreateProject, mtbImportProject, mtbRunEditor, mtbShowDoc } from './mtbcommands';
import path = require('path');
import fs = require('fs') ;
import { getModusToolboxChannel, getMTBDocumentationTreeProvider, getMTBProgramsTreeProvider, initMtbInfo } from './mtbinfo';

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

	let panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
		'mtbassist', 
		'ModusToolbox', 
		vscode.ViewColumn.One, 
        {
			enableScripts: true
		  }
	) ;
	let html: string = "" ;

	html += `<!DOCTYPE html>
	<html lang="en">
	<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>ModusToolbox Asssitant</title>
	</head>
	<body>
		<script>
		function sendCommand(name: string)) {
			const vscode = acquireVsCodeApi();
			vscode.postMessage({ command: name }) ;
		}
		</script>
	<h1>ModusToolbox Assistant</h1>
	<h3>For ModusToolbox 3.0 from Infineon</h3>
	<ul>
	<li><a onclick="const vscode = acquireVsCodeApi() ; vscode.postMessage({ command: 'createNew'}) ;" href="#">Create A New Project</a></li>
	<li><a onclick="const vscode = acquireVsCodeApi() ; vscode.postMessage({ command: 'importExisting'}) ;" href="#">Import An Existing Project</a></li>
	<li><a onclick="const vscode = acquireVsCodeApi() ; vscode.postMessage({ command: 'showModusToolbox'}) ;" href="#">Show ModusToolbox View</a></li>
	</ul>
	</body>
	</html>`;
	panel.webview.html = html ;

	panel.webview.onDidReceiveMessage( (message)=> {
		if (message.command === "createNew") {
			vscode.commands.executeCommand("mtbassist.mtbCreateProject") ;
		}
		else if (message.command === "importExisting") {
			vscode.commands.executeCommand("mtbassist.mtbImportProject") ;
		}
		else if (message.command === "showModusToolbox") {
			vscode.commands.executeCommand("mtbglobal.focus") ;
		}
	}) ;
}

// this method is called when your extension is deactivated
export function deactivate() {
}
