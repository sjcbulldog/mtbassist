import { MtbManagerBase } from "../mgrbase/mgrbase";
import { ApplicationType } from "../mtbenv/appdata/mtbappinfo";
import { MTBAssistObject } from "./mtbassistobj";
import * as path from 'path' ;
import * as vscode from 'vscode';

export class IntelliSenseMgr extends MtbManagerBase {
    private static readonly gccUUID = '8472a194-a4ec-4c1b-bfda-b6fca90b3f0d' ;

    private hasClangD: boolean = false;

    constructor(ext: MTBAssistObject) {
        super(ext);   
    }

    public mtbSetIntellisenseProject() {
        const prefix: string = "Intellisense: ";
        if (!this.hasClangD) {
            vscode.window.showInformationMessage("The 'clangd' extension is not installed. The ModusToolbox Assistant cannot manage intellisense.");
        }
        else if (!this.ext.env || !this.ext.env.appInfo) {
            vscode.window.showInformationMessage("No ModusToolbox Application Loaded");
        }
        else {
            let projnames: string[] = [];
            for (let proj of this.ext.env.appInfo.projects) {
                projnames.push(prefix + proj.name);
            }

            vscode.window.showQuickPick(projnames, { canPickMany: false })
                .then((picked: string | undefined) => {
                    if (picked) {
                        let proj: string = picked.substring(prefix.length);
                        this.setIntellisenseProject(proj);
                    }
                });
        }
    }

    public async trySetupIntellisense(): Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            try {
                //
                // This eliminates issues with the life cycle of the clangd extension.
                //
                this.ext.logger.info("Activating 'clangd' extension");
                // await vscode.commands.executeCommand('clangd.activate');
            }
            catch (err) {
                let errobj: Error = (err as any) as Error;
                this.ext.logger.error("Error activating 'clangd' extension: " + errobj.message);
                resolve() ;
            }                 
            this.init();
            if (this.hasClangD) {
                await this.checkBasicClangdConfig();
            }

            if (this.hasClangD) {
                if (this.ext.env && this.ext.env.appInfo) {
                    if (this.ext.env.appInfo.projects.length > 1) {
                        //
                        // More than one project, ask the user to choose the intellisense project.
                        //
                        vscode.window.showInformationMessage("This ModusToolbox project has more than one project.  " +
                            "Only one project at a time can be active for intellisense.  " +
                            "This can be changed at any time by clicking the MTB status item in the right of the status bar. " +
                            "Do you want to select the active Intellisense project?",
                            "Yes", "No")
                            .then((answer) => {
                                if (answer === "Yes") {
                                    vscode.commands.executeCommand('mtbassist2.mtbSetIntellisenseProject');
                                }
                            });
                    }
                    else if (this.ext.env.appInfo.projects.length === 1) {
                        //
                        // Just one project, set it to be the intellisense project
                        //
                        this.setIntellisenseProject(this.ext.env.appInfo.projects[0].name);
                    }
                }
            }
        });

        return ret;
    }

    public async setIntellisenseProject(projname: string) {
        const settings: string = "clangd.arguments";
        let proj = this.ext.env?.appInfo?.projects.find((proj) => proj.name === projname);
        let iset: boolean = false;

        if (proj) {
            //
            // Find the compile commands file
            //
            let compilecmds: string;

            if (this.ext.env!.appInfo!.type() === ApplicationType.Application) {
                compilecmds = "${workspaceFolder}/" + proj.name + "/build";
            }
            else {
                compilecmds = "${workspaceFolder}/build";
            }

            let config = await vscode.workspace.getConfiguration();
            let clangargs: string[] = config.get(settings) as string[];
            clangargs = this.updateCompileCommands(clangargs, compilecmds);
            config.update(settings, clangargs, vscode.ConfigurationTarget.Workspace)
                .then((value) => {
                    vscode.commands.executeCommand('clangd.restart')
                        .then((obj) => {
                            iset = true ;
                        });
                });


            iset = true;
        }

        if (!iset) {
            this.setIntellisenseProject("");
        }
    }

    private init() {
        let clangd = vscode.extensions.getExtension("llvm-vs-code-extensions.vscode-clangd");
        if (clangd === undefined) {
            this.hasClangD = false;
            this.logger.info("CLANGD extension not installed.");
            vscode.window.showInformationMessage("The ModusToolbox Assistant will manage intellisense to provide an optimal experience, " +
                "but this only works with the 'clangd' extension.  It is highly recommended the that 'clangd' extension also be installed.");
        } else {
            this.hasClangD = true;
        }
    }

    private updateCompileCommands(args: string[], cmds: string): string[] {
        let option: string = "--compile-commands-dir=";
        let ret: string[] = [];

        for (let arg of args) {
            if (!arg.startsWith(option)) {
                ret.push(arg);
            }
        }

        ret.push(option + cmds);

        return ret;
    }

    private overrideOption(option: string): boolean {
        let ret: boolean = false;
        let set: string[] = ["--query-driver", "--background-index"];

        for (let opt of set) {
            if (option.startsWith(opt)) {
                ret = true;
                break;
            }
        }

        return ret;
    }

    private async checkBasicClangdConfig(): Promise<void> {
        let ret: Promise<void> = new Promise<void>(async (resolve, reject) => {
            let option: string = "--query-driver=";
            const settings: string = "clangd.arguments";
            let config = await vscode.workspace.getConfiguration();

            let args: string[] = config.get(settings) as string[];

            let ret: string[] = [];
            for (let arg of args) {
                if (!this.overrideOption(option)) {
                    ret.push(arg);
                }
            }

            //
            // TODO: If a new GCC is supplied via the path mechanism, or if the user has 
            //       overridden the GCC path this will not work.  Since core-make determines
            //       the compiler to use, we should have get_app_info output the actual compiler
            //       path for the compiler.
            //
            // Note: Since this is only for intellisense, the default GCC in the tools directory
            //       works ok for sure and is much better than what is there without these changes, so
            //       defaulting to GCC in the tools directory is not all bad.
            //
            let gcctool = this.ext.env!.toolsDB.findToolByGUID(IntelliSenseMgr.gccUUID);
            if (gcctool === undefined) {
                this.ext.logger.error("GCC tool not found for intellisense setup.");
                resolve() ;
                return ;
            }
            let p = path.join(gcctool.path, "bin", "arm-none-eabi-gcc");
            ret.push("--log=verbose");
            ret.push("--background-index");

            config.update(settings, ret, vscode.ConfigurationTarget.Workspace)
                .then(() => {
                    resolve();
                });
        });

        return ret;
    }
}