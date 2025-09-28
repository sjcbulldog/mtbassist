import { MTBSetting } from "../comms";
import { MTBSettings } from "../extobj/mtbsettings";
import { ModusToolboxEnvironment } from "../mtbenv";

export abstract class VSCodeTaskGenerator {
    public static taskNameBuild = "Build" ;
    public static taskNameRebuild = "Rebuild" ;
    public static taskNameEraseDevice = "Erase Device" ;
    public static taskNameEraseAll = "Erase All" ;
    public static taskNameQuickProgram = "Quick Program" ;
    public static taskNameClean = "Clean" ;
    public static taskNameBuildProgram = "Build & Program" ;
    public static taskNameBuildApplication = "Build Application" ;

    protected env_: ModusToolboxEnvironment ;
    protected settings_: MTBSettings ;

    public constructor(env: ModusToolboxEnvironment, settings: MTBSettings) {
        this.env_ = env ;
        this.settings_ = settings ;
    }
    
    public abstract generateTask(taskname: string): any ;
    public abstract getRequiredTasks(): string[] ;
    

    protected abstract isBuildTask(taskname: string) : boolean ;

    protected createTaskName(task: string, project?: string) : string {
        return task + (project ? ':' + project : '') ;
    }


    // #region utiltiy functions for make task generation
    protected genToolsPath() : string {
        return `export CY_TOOLS_PATHS=\${config:modustoolbox.toolsPath}` ;
    }

    protected genArgs() : string {
        let args: string = "" ;
        let p : string ;

        let setting = this.settings_.settingByName('toolchain') ;
        if (setting && setting.value && typeof setting.value === 'string' && setting.value.length > 0) {
            args = 'TOOLCHAIN=' + setting.value ;

            switch(setting.value) {
            case 'GCC_ARM':
                let gccsetting: MTBSetting | undefined = this.settings_.settingByName('gccpath') ;
                p = (gccsetting!.value as string).replace(/\\/g, '/') ;                  
                if (gccsetting && gccsetting.value && typeof gccsetting.value === 'string' && gccsetting.value.length > 0) {
                    args += ` CY_COMPILER_GCC_ARM_DIR=${p}` ;
                }
                break ;
            case 'IAR':
                let iarsetting: MTBSetting | undefined = this.settings_.settingByName('iarpath') ;
                p = (iarsetting!.value as string).replace(/\\/g, '/') ;
                if (iarsetting && iarsetting.value && typeof iarsetting.value === 'string' && iarsetting.value.length > 0) {
                    args += ` CY_COMPILER_IAR_DIR=${p}` ;
                }
                break ;
            case 'ARM':
                let armccsetting: MTBSetting | undefined = this.settings_.settingByName('armccpath') ;
                p = (armccsetting!.value as string).replace(/\\/g, '/') ;
                if (armccsetting && armccsetting.value && typeof armccsetting.value === 'string' && armccsetting.value.length > 0) {
                    args += ` CY_COMPILER_ARM_DIR=${p}` ;
                }
                break ;
            case 'LLVM_ARM':
                let llvmsetting: MTBSetting | undefined = this.settings_.settingByName('llvmpath') ;
                p = (llvmsetting!.value as string).replace(/\\/g, '/') ;
                if (llvmsetting && llvmsetting.value && typeof llvmsetting.value === 'string' && llvmsetting.value.length > 0) {
                    args += ` CY_COMPILER_LLVM_ARM_DIR=${p}` ;
                }
                break ;
            }
        }

        setting = this.settings_.settingByName('configuration') ;
        if (setting && setting.value && typeof setting.value === 'string' && setting.value.length > 0 && (setting.value === 'Debug' || setting.value === 'Release')) {
            args += ` CONFIG=${setting.value}` ;
        }
        return args ;
    }


    //
    // Generate a task that calls make to perform the specified command
    //
    protected generateMakeTask(labelstr: string, cmd: string, args: string, matcher: boolean, project?: string) : any {
        let unixarg: string ;
        let winarg: string ;
        let label: string ;
        let targetstr: string ;

        let words = labelstr.split(':') ;
        label = words[0] ;

        if (this.isBuildTask(label)) {
            // This adds the toolchain and compiler path args to the build commands
            if (args.length > 0) {
                args += ' ' ;
            }
            args += this.genArgs() ;
        }        

        if (project) {
            targetstr = cmd + "_proj " + args ;
        }
        else {
            targetstr = cmd + " " + args ;
        }

        if (project) {
            winarg = `export PATH=/bin:/usr/bin:$PATH ; ${this.genToolsPath()} ; \${config:modustoolbox.toolsPath}/modus-shell/bin/make.exe ${targetstr}`;
            unixarg = `${this.genToolsPath() } ; make ${targetstr} `;            
        }
        else {
            winarg = `export PATH=/bin:/usr/bin:$PATH ; ${this.genToolsPath()} ; \${config:modustoolbox.toolsPath}/modus-shell/bin/make.exe ${targetstr}`;
            unixarg = `${this.genToolsPath() } ; make ${targetstr} `;            
        }

        let task : any =  {
            "label": labelstr,
            "type": "process",
            "command": "bash",
            "args": [
                "--norc",
                "-c",
                unixarg
            ],

            "windows" : {
                "command": "${config:modustoolbox.toolsPath}/modus-shell/bin/bash.exe",
                "args": [
                    "--norc",
                    "-c",
                    winarg
                ]
            },
        } ;

        if (matcher) {
            if (project) {
                let matchobj = {
                    "base" : "$gcc",
                    "fileLocation" : ["relative", "${workspaceRoot}/" + project]
                } ;
                task.problemMatcher = matchobj ;                
            }
            else {
                task.problemMatcher = "$gcc" ;
            }
        }

        if (this.isBuildTask(label)) {
            task.group = {
                "kind": "build",
                "isDefault": true            
            } ;
        }

        return task ;
    }    

    // #endregion    
}