import { MTBAssistObject } from "../extobj/mtbassistobj";
import { ModusToolboxEnvironment } from "../mtbenv";
import { STask } from "./stask";
import * as fs from 'fs' ;
import * as path from 'path' ;
import * as os from 'os' ;
import * as vscode from 'vscode' ;

export class AddBootloaderTask implements STask {
    private static readonly bootloaderProjectName = 'proj_bootloader' ;
    private static readonly bootloaderCEID = 'mtb-example-edge-protect-bootloader' ;
    private ext_ : MTBAssistObject ;

    public constructor(private mtbObj: MTBAssistObject) {
        this.ext_ = this.mtbObj ;
    }

    public async run() : Promise<void> {
        let ret = new Promise<void>( async (resolve, reject) => {
            // this.copyInBootloader()
            //     .then(() => {
            //         this.addBootloaderToAppConfig()
            //         .then(() => {
            //             resolve() ;
            //         })
            //         .catch( (error) => {
            //             reject(error) ;
            //         }) ;
            //     }).catch((err) => {
            //         reject(err) ;
            //     }) ;
            this.addBootloaderProjectToMakefile()
            .then(() => {
                this.fixupCombinerSigner()
                .then(() => {
                    resolve() ;
                })
                .catch( (error) => {
                    reject(error) ;
                }) ;
            })
            .catch((error) => {
                reject(error) ;
            });

        }) ;                
        return ret ;
    }

    private createUniqueTempDirectory(): Promise<string> {
        const systemTempDir = os.tmpdir();
        const prefix = 'mtbassist-'; // Optional prefix for your directory
        const tempDirPath = path.join(systemTempDir);

        let ret = new Promise<string>( (resolve, reject) => {
            try {
                let ret = fs.mkdtempSync(path.join(tempDirPath, prefix), 'utf-8') ;
                resolve(ret) ;
            } catch (error) {
                reject(error);
            }
        }) ;

        return ret ;
    }

    private getEditorFromActive(uri: vscode.Uri) : vscode.TextEditor | undefined {
        for(const editor of vscode.window.visibleTextEditors) {
            if (editor.document.uri.toString() === uri.toString()) {
                return editor;
            }
        }
        return undefined;
    }

    private getEditor(uri: vscode.Uri) : Promise<vscode.TextEditor | undefined> {
        let ret = new Promise<vscode.TextEditor | undefined>( (resolve, reject) => {
            let editor = this.getEditorFromActive(uri) ;
            if (editor) {
                resolve(editor) ;
                return ;
            }
            vscode.window.showTextDocument(uri, { preview: false })
            .then((ed) => {
                resolve(ed) ;
                return ;
            }) ;
        });

        return ret ;
    }


    private fixupCombinerSigner() : Promise<void> {
        let ret = new Promise<void>( async (resolve, reject) => {
            if (!this.ext_.env) { 
                reject('internal error: ModusToolbox environment not set.') ;
                return ;
            }

            if (!this.ext_.env.appInfo) {
                reject('internal error: ModusToolbox application not loaded.') ;
                return ;
            }

            let mkfile = path.join(this.ext_.env.appInfo.appdir, 'common.mk') ;
            if (!fs.existsSync(mkfile)) {
                reject('Could not find Makefile in application directory.') ;
                return ;
            }

            let mkuri = vscode.Uri.file(mkfile);         
            vscode.workspace.openTextDocument(mkuri)
            .then((doc) => {
                this.getEditor(mkuri)
                .then((editor) => {
                    if (!editor) {
                        reject('Could not open Makefile for editing.') ;
                        return ;
                    }
                    this.updateSignerCombiner(doc, editor)
                    .then(() => {
                        resolve() ;
                    })
                    .catch((error) => {
                        reject(error) ;
                    }) ;
                })
                .catch((error) => { 
                    reject('Could not open Makefile for editing: ' + error) ;
                }) ;
            }) ;               
        }) ;
        return ret ;
    }    

    private updateSignerCombiner(doc: vscode.TextDocument, editor: vscode.TextEditor) : Promise<void> { 
        let regex = /^COMBINE_SIGN_JSON?=.*$/m;
        let ret = new Promise<void>( async (resolve, reject) => {
            let match = regex.exec(doc.getText());
            if (!match) {
                reject('Could not find COMBINE_SIGN_JSON variable in common.mk');
                return;
            }

            let newText = doc.getText().replace(regex, `COMBINE_SIGN_JSON?=./bsps/TARGET_$(TARGET)/config/GeneratedSource/boot_with_bldr.json`);
            editor.edit((editBuilder) => {
                editBuilder.replace(new vscode.Range(0, 0, doc.lineCount, 0), newText);
                resolve() ;
            });            
        }) ;
        return ret ;
    }    

    private addBootloaderProjectToMakefile() : Promise<void> {
        let ret = new Promise<void>( async (resolve, reject) => {
            if (!this.ext_.env) { 
                reject('internal error: ModusToolbox environment not set.') ;
                return ;
            }

            if (!this.ext_.env.appInfo) {
                reject('internal error: ModusToolbox application not loaded.') ;
                return ;
            }

            let mkfile = path.join(this.ext_.env.appInfo.appdir, 'Makefile') ;
            if (!fs.existsSync(mkfile)) {
                reject('Could not find Makefile in application directory.') ;
                return ;
            }

            let mkuri = vscode.Uri.file(mkfile);
            vscode.workspace.openTextDocument(mkuri)
            .then((doc) => {
                this.getEditor(mkuri)
                .then((editor) => {
                    if (!editor) {
                        reject('Could not open Makefile for editing.') ;
                        return ;
                    }
                    this.addBootloaderProject(doc, editor)
                    .then(() => {
                        resolve() ;
                    })
                    .catch((error) => {
                        reject(error) ;
                    }) ;
                })
                .catch((error) => { 
                    reject('Could not open Makefile for editing: ' + error) ;
                }) ;
            }) ;
        }) ;
        return ret ;
    }

    private addBootloaderProject(doc: vscode.TextDocument, editor: vscode.TextEditor) : Promise<void> { 
        let regex = /^MTB_PROJECTS=\s*([a-zA-Z0-9_]+(?:\s+[a-zA-Z0-9_]+)*)\s*$/m;
        let ret = new Promise<void>( async (resolve, reject) => {
            let match = regex.exec(doc.getText());
            if (!match) {
                reject('Could not find MTB_PROJECTS variable in Makefile.');
                return;
            }

            let projects = match[1].split(/\s+/);
            if (projects.includes(AddBootloaderTask.bootloaderProjectName)) {
                // Bootloader project is already included
                resolve();
                return;
            }

            // Add bootloader project to the list
            projects.push(AddBootloaderTask.bootloaderProjectName);
            let newText = doc.getText().replace(regex, `MTB_PROJECTS= ${projects.join(' ')}`);
            editor.edit((editBuilder) => {
                editBuilder.replace(new vscode.Range(0, 0, doc.lineCount, 0), newText);
                resolve() ;
            });
        });
        return ret ;
    }

    private copyInBootloader() : Promise<void> {
        let ret = new Promise<void>( async (resolve, reject) => {
            if (!this.ext_.env) { 
                reject('internal error: ModusToolbox environment not set.') ;
                return ;
            }

            if (!this.ext_.env.appInfo) {
                reject('internal error: ModusToolbox application not loaded.') ;
                return ;
            }

            let bloadpath = path.join(this.ext_.env.appInfo.appdir, AddBootloaderTask.bootloaderProjectName) ;
            if (fs.existsSync(bloadpath)) {
                // A project named proj_bootloader already exists in the application
                // directory. We won't overwrite it.
                this.ext_.logger.info('A project named proj_bootloader already exists in the application directory. Not overwriting it.') ;
                resolve() ;
                return ;
            }

            let tmpdir : string ;
            
            try {
                tmpdir = await this.createUniqueTempDirectory() ;
            } catch(err) {
                reject('Could not create temporary directory: ' + err) ;
                return ;
            }

            let bspid = this.ext_.env.appInfo.projects[0].target ;
            if (bspid.startsWith('APP_')) {
                bspid = bspid.substring(4) ;
            }

            this.ext_.createProjectDirect(tmpdir, 'APPNAME', bspid, AddBootloaderTask.bootloaderCEID, false)
            .then( (result: [number, string[]]) => {
                if (result[0] !== 0) {
                    reject('Could not create bootloader project: ' + result[1].join('\n')) ;
                    return ;
                }

                let srcdir = path.join(tmpdir, 'APPNAME', AddBootloaderTask.bootloaderProjectName) ;
                if (!fs.existsSync(srcdir)) {
                    reject('Could not find created bootloader project in temporary directory.') ;
                    return ;
                }

                // Now copy the directory tree from srcdir to bloadpath
                fs.cp(srcdir, bloadpath, { recursive: true }, (err) => {
                    if (err) {
                        fs.rmSync(srcdir, { recursive: true, force: true }) ;
                        reject('Could not copy bootloader project to application directory: ' + err) ;
                        return ;
                    }
                    fs.rmSync(srcdir, { recursive: true, force: true }) ;                    
                    resolve() ;
                }) ;
            })
            .catch( (error) => {
                reject('Could not create project: ' + error) ;
            });

        }) ;
        return ret;
    }
}
