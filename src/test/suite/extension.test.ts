import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { MTBVersion } from '../../manifest/mtbversion';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Version test', () => {
		let ver:MTBVersion = MTBVersion.fromVersionString("xyzzy") ;
		assert.strictEqual(-1, ver.major) ;
	});
});
