/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { MtbManagerBase } from "../mgrbase/mgrbase";
import { ApplicationType } from "../mtbenv/appdata/mtbappinfo";
import { MTBAssistObject } from "./mtbassistobj";
import * as path from 'path' ;
import * as vscode from 'vscode';

// TODO: Add support for other compilers, specifically LLVM

/**
 * IntelliSenseMgr - Manager for VS Code IntelliSense configuration with ModusToolbox projects
 * 
 * This class handles the integration between ModusToolbox projects and VS Code's IntelliSense
 * capabilities through the clangd extension. It automatically configures clangd with the
 * appropriate compile commands and compiler paths to provide accurate code completion,
 * error detection, and navigation for ModusToolbox C/C++ projects.
 */
export class IntelliSenseMgr extends MtbManagerBase {
    /** Flag indicating whether the clangd extension is installed and available */
    private hasClangD: boolean = false;

    /**
     * Constructor - Initialize the IntelliSense manager
     * 
     * @param ext - Reference to the main MTBAssistObject extension instance
     */
    constructor(ext: MTBAssistObject) {
        super(ext);   
    }

    /**
     * Interactive project selection for IntelliSense configuration
     * 
     * Presents a quick pick menu to the user allowing them to select which
     * project in their ModusToolbox application should be configured for
     * IntelliSense. This is useful in multi-project applications where
     * different projects may have different build configurations.
     */
    public mtbSetIntellisenseProject() {
        const prefix: string = "Intellisense: ";
        
        // Check if clangd extension is available
        if (!this.hasClangD) {
            vscode.window.showInformationMessage("The 'clangd' extension is not installed. The ModusToolbox Assistant cannot manage intellisense.");
        }
        // Check if ModusToolbox application is loaded
        else if (!this.ext.env || !this.ext.env.appInfo) {
            vscode.window.showInformationMessage("No ModusToolbox Application Loaded");
        }
        else {
            // Build list of available projects for selection
            let projnames: string[] = [];
            for (let proj of this.ext.env.appInfo.projects) {
                projnames.push(prefix + proj.name);
            }

            // Present project selection to user
            vscode.window.showQuickPick(projnames, { canPickMany: false })
                .then((picked: string | undefined) => {
                    if (picked) {
                        // Extract project name and configure IntelliSense
                        let proj: string = picked.substring(prefix.length);
                        this.setIntellisenseProject(proj);
                    }
                });
        }
    }

    /**
     * Initialize IntelliSense support for ModusToolbox projects
     * 
     * Sets up the IntelliSense manager by checking for clangd extension
     * availability and configuring basic clangd settings if available.
     * This method should be called during extension startup.
     * 
     * @returns Promise that resolves when IntelliSense setup is complete
     */
    public async trySetupIntellisense(): Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            // Initialize clangd detection and basic setup
            this.init();
            if (this.hasClangD) {
                await this.checkBasicClangdConfig();
            }
            
            this.ext.logger.debug('Intellisense manager setup successfully') ;
            resolve() ;
        });

        return ret;
    }

    /**
     * Configure IntelliSense for a specific ModusToolbox project
     * 
     * Updates clangd configuration to point to the correct compile commands
     * database for the specified project. This enables accurate IntelliSense
     * based on the actual build configuration and compiler flags used by
     * the ModusToolbox build system.
     * 
     * @param projname - Name of the project to configure IntelliSense for
     */
    public async setIntellisenseProject(projname: string) {
        const settings: string = "clangd.arguments";
        let proj = this.ext.env?.appInfo?.projects.find((proj) => proj.name === projname);

        if (proj) {
            // Determine the compile commands directory based on application type
            let compilecmds: string;

            if (this.ext.env!.appInfo!.type() === ApplicationType.application) {
                // Multi-project application: each project has its own build directory
                compilecmds = "${workspaceFolder}/" + proj.name + "/build";
            }
            else {
                // Single project: build directory is at workspace root
                compilecmds = "${workspaceFolder}/build";
            }

            // Update clangd configuration with new compile commands path
            this.checkBasicClangdConfig()
            .then(async () => {
                let config = await vscode.workspace.getConfiguration();
                let clangargs: string[] = config.get(settings) as string[];
                clangargs = this.updateCompileCommands(clangargs, compilecmds);
                config.update(settings, clangargs, vscode.ConfigurationTarget.Workspace)
                    .then((value) => {
                        // Restart clangd to apply new configuration
                        vscode.commands.executeCommand('clangd.restart')
                            .then((obj) => {
                            });
                    });
            })
            .catch((err) => {

            }) ;
        }
    }

    /**
     * Initialize clangd extension detection and user notification
     * 
     * Checks whether the clangd extension is installed and available.
     * If not found, shows an informational message to the user recommending
     * its installation for optimal IntelliSense experience.
     */
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

    /**
     * Update the --compile-commands-dir argument in clangd arguments array
     * 
     * Removes any existing --compile-commands-dir arguments and adds a new one
     * with the specified directory path. This ensures only one compile commands
     * directory is configured and points to the correct location for the project.
     * 
     * @param args - Current clangd arguments array
     * @param cmds - New compile commands directory path
     * @returns Updated arguments array with new compile commands directory
     */
    private updateCompileCommands(args: string[], cmds: string): string[] {
        let option: string = "--compile-commands-dir=";
        let ret: string[] = [];

        // Remove any existing compile-commands-dir arguments
        for (let arg of args) {
            if (!arg.startsWith(option)) {
                ret.push(arg);
            }
        }

        // Add the new compile commands directory argument
        ret.push(option + cmds);

        return ret;
    }

    /**
     * Check if a clangd argument should be overridden by the extension
     * 
     * Determines whether a specific clangd option should be managed by this
     * extension rather than preserved from existing configuration. This prevents
     * conflicts and ensures the extension can properly manage critical settings.
     * 
     * @param option - The clangd argument to check
     * @returns true if the option should be overridden, false otherwise
     */
    private overrideOption(option: string): boolean {
        let ret: boolean = false;
        // Options that should be managed by this extension
        let set: string[] = ["--query-driver", "--background-index"];

        for (let opt of set) {
            if (option.startsWith(opt)) {
                ret = true;
                break;
            }
        }

        return ret;
    }

    /**
     * Configure basic clangd settings for ModusToolbox projects
     * 
     * Sets up essential clangd configuration including verbose logging and
     * background indexing. Also configures the query driver to point to the
     * GCC toolchain from the ModusToolbox environment. This ensures clangd
     * can properly understand the ARM cross-compilation environment.
     * 
     * @returns Promise that resolves when configuration is complete
     */
    private async checkBasicClangdConfig(): Promise<void> {
        let ret: Promise<void> = new Promise<void>(async (resolve, reject) => {
            const settings: string = "clangd.arguments";
            let config = await vscode.workspace.getConfiguration();

            let args: string[] = config.get(settings) as string[];

            // Filter out any options that this extension will manage
            let ret: string[] = [];
            for (let arg of args) {
                if (!this.overrideOption(arg)) {
                    ret.push(arg);
                }
            }

            let toolchain = this.ext.getToolchainAndPath() ;
            if (!toolchain) {
                return ;
            }
            
            // Configure clangd with essential ModusToolbox-specific settings

            ret.push("--background-index");     // Enable background indexing for better performance

            let p = toolchain[1].replace(/\\/g, '/') ;
            ret.push('--query-driver=' + p) ;
            
            // Apply the updated configuration to workspace settings
            config.update(settings, ret, vscode.ConfigurationTarget.Workspace)
                .then(() => {
                    resolve();
                });
        });

        return ret;
    }
}