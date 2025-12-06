import { MTBAssistObject } from "../extobj/mtbassistobj";
import { ModusToolboxEnvironment } from "../mtbenv";
import { STask } from "./stask";
import * as fs from 'fs' ;
import * as path from 'path' ;
import * as os from 'os' ;
import * as vscode from 'vscode' ;
import * as crypto from 'crypto' ;
import { resolveCliArgsFromVSCodeExecutablePath } from "@vscode/test-electron";

let dummyBldrJsonFile = `{
    "schema-version": 1.0,
    "content":
    [
        {
            "name": "sign_proj_bootloader",
            "enabled" : true,
            "commands" :
            [
                {
                    "command" : "sign",
                    "inputs" :
                    [
                        {
                            "file" : "../../../../build/project_hex/proj_bootloader.hex",
                            "header-size": "0x400",
                            "fill-value" : "0x0",
                            "slot-size" : "0x00028000",
                            "min-erase-size": "0x10",
                            "hex-address" : "0x32011000"
                        }
                    ],
                    "outputs":
                    [
                        {
                            "file" : "../../../../build/project_hex/proj_bootloader_signed.hex",
                            "format": "ihex"
                        }
                    ],
                    "extra_config" : [
                        {
                            "project" : "proj_bootloader",
                            "debug_config_name" : "proj_bootloader",
                            "default" : false,
                            "build_dependency" : "project"
                        }
                    ]
                }
            ]
        },
        {
            "name": "Image 0",
            "enabled" : true,
            "commands" :
            [
                {
                    "command" : "sign",
                    "inputs" :
                    [
                        {
                            "file" : "../../../../build/project_hex/proj_cm33_s.hex",
                            "header-size": "0x400",
                            "fill-value" : "0xFF",
                            "slot-size" : "0x00100000",
                            "overwrite-only" : true,
                            "hex-address" : "0x60000000"
                        }
                    ],
                    "outputs":
                    [
                        {
                            "file" : "../../../../build/project_hex/proj_cm33_s_signed.hex",
                            "format": "ihex"
                        }
                    ]
                    ,
                    "extra_config" : [
                        {
                            "project" : "proj_cm33_s",
                            "debug_config_name" : "proj_cm33_s",
                            "default" : false,
                            "build_dependency" : "project"
                        }
                    ]
                }
            ]
        },
        {
            "name": "Image 1",
            "enabled" : true,
            "commands" :
            [
                {
                    "command" : "sign",
                    "inputs" :
                    [
                        {
                            "file" : "../../../../build/project_hex/proj_cm33_ns.hex",
                            "header-size": "0x400",
                            "fill-value" : "0xFF",
                            "slot-size" : "0x00100000",
                            "overwrite-only" : true,
                            "hex-address" : "0x60140000"
                        }
                    ],
                    "outputs":
                    [
                        {
                            "file" : "../../../../build/project_hex/proj_cm33_ns_signed.hex",
                            "format": "ihex"
                        }
                    ]
                    ,
                    "extra_config" : [
                        {
                            "project" : "proj_cm33_ns",
                            "debug_config_name" : "proj_cm33_ns",
                            "default" : false,
                            "build_dependency" : "project"
                        }
                    ]
                }
            ]
        },
        {
            "name": "Image 2",
            "enabled" : true,
            "commands" :
            [
                {
                    "command" : "sign",
                    "inputs" :
                    [
                        {
                            "file" : "../../../../build/project_hex/proj_cm55.hex",
                            "header-size": "0x400",
                            "fill-value" : "0xFF",
                            "slot-size" : "0x00100000",
                            "overwrite-only" : true,
                            "hex-address" : "0x60280000"
                        }
                    ],
                    "outputs":
                    [
                        {
                            "file" : "../../../../build/project_hex/proj_cm55_signed.hex",
                            "format": "ihex"
                        }
                    ]
                    ,
                    "extra_config" : [
                        {
                            "project" : "proj_cm55",
                            "debug_config_name" : "proj_cm55",
                            "default" : false,
                            "build_dependency" : "project"
                        }
                    ]
                }
            ]
        }
,
        {
            "name": "merge",
            "enabled": true,
            "commands" :
            [
                {
                    "command" : "merge",
                    "inputs" :
                    [
                        {
                            "file" : "../../../../build/project_hex/proj_bootloader_signed.hex"
                        },
                        {
                            "file" : "../../../../build/project_hex/proj_cm33_s_signed.hex"
                        },
                        {
                            "file" : "../../../../build/project_hex/proj_cm33_ns_signed.hex"
                        },
                        {
                            "file" : "../../../../build/project_hex/proj_cm55_signed.hex"
                        }
                    ],
                    "outputs" :
                    [
                        {
                            "file" : "../../../../build/app_combined.hex",
                            "format" : "ihex",
                            "overlap" : "ignore"
                        }
                    ]
                }
            ]
        }
    ]
}
` ;

export class AddBootloaderTask extends STask {
    private static readonly bootloaderProjectName = 'proj_bootloader' ;
    private static readonly bootloaderCEID = 'mtb-example-edge-protect-bootloader' ;
    private ext_ : MTBAssistObject ;

    public constructor(private mtbObj: MTBAssistObject) {
        super();
        this.ext_ = this.mtbObj ;
    }

    public async run() : Promise<void> {
        let ret = new Promise<void>( async (resolve, reject) => {
            this.startOperation('Adding bootloader to project...') ;
            this.copyInBootloader()
                .then(() => {
                    this.addStatusLine('Updating the application Makefile ...') ;
                    this.addBootloaderProjectToMakefile()
                    .then(() => {
                        this.reveal() ;
                        this.addStatusLine('Updating the signer/combiner settings in common.mk ...') ;
                        this.fixupCombinerSigner()
                        .then(() => {
                            this.addStatusLine('Creating temporary boot_with_bldr.json file ...') ;
                            this.addBuildWithBldrJsonFile()
                            .then(() => {
                                this.reveal() ;
                                this.addStatusLine('Refreshing new bootloader project (make getlibs)...') ;
                                this.ext_.fixMissingAssetsForProject(AddBootloaderTask.bootloaderProjectName)
                                .then(() => {
                                    this.addStatusLine('Updating vscode project files (make vscode) ...') ;
                                    this.ext_.runMakeVSCode({})
                                    .then(() => {
                                        this.addStatusLine('Adding bootloader project to workspace...') ;
                                        this.addToWorkspace()
                                        .then(() => {
                                            this.finishOperation(true) ;
                                            resolve();
                                        })
                                        .catch((err) => {
                                            reject(err) ;
                                        }) ;
                                    })
                                    .catch((err) => {
                                        reject(err) ;
                                    }) ;
                                })
                                .catch((error) => {
                                    reject(error);
                                });
                            })
                            .catch( (error) => {
                                reject(error) ;
                            }) ;
                        })
                        .catch( (error) => {
                            reject(error) ;
                        }) ;
                    })
                    .catch( (error) => {
                        reject(error) ;
                    }) ;
                }).catch((err) => {
                    this.addStatusLine('Error: ' + err) ;
                    this.finishOperation(false) ;
                    reject(err) ;
                }) ;
        }) ;                
        return ret ;
    }

    private addBuildWithBldrJsonFile() : Promise<void> {
        let ret = new Promise<void>( async (resolve, reject) => {
            let bspname = this.ext_.env!.appInfo!.projects[0].target ;
            let jsonfile = path.join(this.ext_.env!.appInfo!.appdir!,`bsps/TARGET_${bspname}/config/GeneratedSource/boot_with_bldr.json`) ;
            if (!fs.existsSync(jsonfile)) {
                fs.writeFileSync(jsonfile, dummyBldrJsonFile) ;
            }

            resolve() ;
        }) ;
        return ret ;
    }

    private addToWorkspace() : Promise<void> {
        let ret = new Promise<void>( async (resolve, reject) => {
            let projdir = path.join(this.ext_.env!.appInfo!.appdir, AddBootloaderTask.bootloaderProjectName) ;
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                const newFolders = [ vscode.workspace.workspaceFolders![0], { uri: vscode.Uri.file(projdir) } , ...vscode.workspace.workspaceFolders.slice(1, vscode.workspace.workspaceFolders.length) ] ;
                vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0, ...newFolders) ;
            }
            resolve() ;
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
                        setTimeout(() => { doc.save(); }, 100);
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
        let regex = /^COMBINE_SIGN_JSON.*$/m;
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
                        setTimeout(() => { doc.save() ; }, 100) ;
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
            projects.unshift(AddBootloaderTask.bootloaderProjectName);
            let newText = doc.getText().replace(regex, `MTB_PROJECTS= ${projects.join(' ')}`);
            editor.edit((editBuilder) => {
                editBuilder.replace(new vscode.Range(0, 0, doc.lineCount, 0), newText);
                doc.save() ;
                resolve() ;
            });
        });
        return ret ;
    }

    private addDirToHash(dir: string, hash: crypto.Hash) : void {
        const items = fs.readdirSync(dir);
        for(let item of items) {
            const fullPath = path.join(dir, item);
            const stats = fs.statSync(fullPath);
            if (stats.isFile()) {
                const fileBuffer = fs.readFileSync(fullPath);
                const u8buffer = new Uint8Array(fileBuffer) ;
                hash.update(u8buffer) ;
            } else if (stats.isDirectory()) {
                this.addDirToHash(fullPath, hash);
            }
        }
    }

    private computeDirHash(dir: string) : string {
        const hash = crypto.createHash('md5');
        this.addDirToHash(dir, hash) ;
        let ret = hash.digest('hex') ;
        return ret ;
    }

    private verifyBootloaderProject(dir: string, sumfile: string) : Promise<boolean> {
        let ret = new Promise<boolean>( (resolve, reject) => {
            let hash = this.computeDirHash(dir) ;
            fs.readFile(sumfile, 'utf-8', (err, data) => {
                if (err) {
                    reject(err) ;
                    return ;
                }
                resolve(data.trim() === hash.trim()) ;
            }) ;
        }) ;
        return ret ;
    }

    private computeChecksum(dir: string, sumfile: string) : Promise<void> {
        let ret = new Promise<void>( (resolve, reject) => {
            let h = this.computeDirHash(dir) ;
            fs.writeFile(sumfile, h, (err) => {
                if (err) {
                    reject(err) ;
                    return ;
                }
                resolve() ;
            }) ;
        }) ;
        return ret ;
    }

    private getUniqueProjectName(dir: string) : string | undefined {
        for(let i = 0 ; i < 100000 ; i++) {
            let strnum = String(i).padStart(5, '0') ;
            let projname = 'mtbassist_' + strnum ;
            let projpath = path.join(dir, projname) ;
            if (!fs.existsSync(projpath)) {
                return projname ;
            }
        }

        return undefined ;
    }

    private createBootloaderProject() : Promise<string> {
        let ret = new Promise<string>( async (resolve, reject) => {
            let tmpdir : string ;
            
            try {
                // This is the directory that will hold the project
                tmpdir = path.dirname(this.ext_.env!.appInfo!.appdir) ;
            } catch(err) {
                reject('Could not create temporary directory: ' + err) ;
                return ;
            }

            let bspid = this.ext_.env!.appInfo!.projects[0].target ;
            if (bspid.startsWith('APP_')) {
                // TODO: how do we get the base target from the application
                bspid = bspid.substring(4) ;
            }

            let projname : string | undefined = this.getUniqueProjectName(tmpdir) ;
            if (!projname) {
                reject(`Could not create temporary project name in directory ${tmpdir}`) ;
                return ;
            }

            this.ext_.createProjectDirect(tmpdir, projname!, bspid, AddBootloaderTask.bootloaderCEID, false)
            .then( (result: [number, string[]]) => {
                if (result[0] !== 0) {
                    fs.rmSync(path.join(tmpdir, projname!), { recursive: true, force: true }) ;
                    reject('Could not create bootloader project: ' + result[1].join('\n')) ;
                    return ;
                }

                let srcdir = path.join(tmpdir, projname!, AddBootloaderTask.bootloaderProjectName) ;
                if (!fs.existsSync(srcdir)) {
                    reject('Could not find created bootloader project in temporary directory.') ;
                    return ;
                }

                resolve(path.join(tmpdir, projname!, AddBootloaderTask.bootloaderProjectName)) ;
            })
            .catch( (error) => {
                reject('Could not create project: ' + error) ;
            });            
        }) ;
        return ret ;
    }

    private putBootloaderInBootLoaderLib() : Promise<string> {
        let ret = new Promise<string>( async (resolve, reject) => {
            let ver = this.ext_!.env!.manifestDB.getCodeExampleLatestVersion(AddBootloaderTask.bootloaderCEID) ;
            if (!ver) {
                reject('Could not find bootloader code example in ModusToolbox manifest.') ;
                return ;
            }

            let blpath = this.ext_.extStorageDir('bootloaders') ;
            let bllibpath = path.join(blpath, ver) ;
            let sumpath = path.join(blpath, ver + '.sum') ;

            if (fs.existsSync(bllibpath) && fs.existsSync(sumpath)) {
                this.addStatusLine('Verifying existing bootloader project...') ;
                let isValid = await this.verifyBootloaderProject(bllibpath, sumpath) ;
                if (isValid) {
                    resolve(bllibpath) ;
                    return ;
                }
                else {
                    this.addStatusLine('Existing bootloader project is invalid. Re-creating project...') ;
                    fs.rmSync(bllibpath, { recursive: true, force: true }) ;
                    fs.rmSync(sumpath, { force: true }) ;
                }
            }
            else if (fs.existsSync(bllibpath)) {
                // The bootloader directory exists but not the .sum file.
                // Remove the directory and re-download.
                fs.rmSync(bllibpath, { recursive: true, force: true }) ;
            }

            this.addStatusLine('Retrieving bootloader project (this takes a while) ...') ;
            this.createBootloaderProject() 
            .then((projdir) => {         
                // Now copy the directory tree from srcdir to bloadpath
                this.addStatusLine('Copying bootloader project to bootloader library ...') ;
                try {
                    fs.cpSync(projdir, bllibpath, { recursive: true }) ;
                    fs.rmSync(path.dirname(projdir), { recursive: true, force: true }) ;                    
                } catch (err) {
                    fs.rmSync(path.dirname(projdir), { recursive: true, force: true }) ;
                    reject('Could not copy bootloader project to bootloader library: ' + err) ;
                }

                this.computeChecksum(bllibpath, sumpath)
                    .then(() => {
                        resolve(bllibpath) ;
                    })
                    .catch((err) => {
                        reject('Could not compute checksum for bootloader project: ' + err) ;
                    }) ;
            })
            .catch( (error) => {
                reject('Could not create bootloader project: ' + error) ;
            });
        }) ;

        return ret ;
    }

    private copyInBootloader() : Promise<void> {
        let ret = new Promise<void>( async (resolve, reject) => {
            let bloadpath = path.join(this.ext_.env!.appInfo!.appdir, AddBootloaderTask.bootloaderProjectName) ;
            if (fs.existsSync(bloadpath)) {
                // A project named proj_bootloader already exists in the application
                // directory. We won't overwrite it.
                this.ext_.logger.info('A project named proj_bootloader already exists in the application directory. Not overwriting it.') ;
                resolve() ;
                return ;
            }

            this.putBootloaderInBootLoaderLib()
            .then((srcdir) => {
                this.addStatusLine('Copying bootloader project to application ...') ;
                fs.cp(srcdir, bloadpath, { recursive: true }, (err) => {    
                    if (err) {
                        reject('Could not copy bootloader project to application directory: ' + err) ;
                        return ;
                    }
                    resolve() ;
                }) ;
            })
            .catch((error) => {
                reject(error) ;
            }) ;
        }) ;
        return ret;
    }
}
