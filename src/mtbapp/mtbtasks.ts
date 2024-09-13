import * as path from 'path' ;
import * as fs from 'fs' ;
import { AppType, MTBAppInfo } from './mtbappinfo';
import { MTBExtensionInfo } from '../mtbextinfo';

interface LooseObject {
    [key: string]: any
}

export class MTBTasks
{
    public static taskNameBuild = "Build" ;
    public static taskNameBuildNinja = "Build/Ninja" ;
    public static taskNameRebuild = "Rebuild" ;
    public static taskNameRebuildNinja = "Rebuild/Ninja" ;    
    public static taskNameErase = "Erase" ;
    public static taskNameProgram = "Program" ;
    public static taskNameClean = "Clean" ;
    public static taskNameBuildProgram = "Build & Program" ;
    public static taskNameBuildProgramNinja = "Build/Ninja & Program" ;

    private appinfo_ : MTBAppInfo ;
    private filename_ : string ;
    private tasks_ : any [] = [] ;
    private valid_: boolean = false ;

    private static validVersion = "2.0.0" ;

    constructor(appinfo: MTBAppInfo, filename: string) {
        this.appinfo_ = appinfo ;

        this.filename_ = filename ;
        if (fs.existsSync(filename)) {
            let taskdata = fs.readFileSync(filename, 'utf8') ;
            taskdata = taskdata.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
            let file ;
            
            try {
                taskdata = taskdata.trim() ;
                if (taskdata.length > 0) {
                    file = JSON.parse(taskdata) ;

                    if (file.version === undefined || typeof file.version !== "string" || file.tasks === undefined || !Array.isArray(file.tasks)) {
                        this.valid_ = false ;
                    }
                    else {
                        this.tasks_ = file.tasks ;
                        this.valid_ = true ;
                    }
                }
            }
            catch(err) {
                this.valid_ = false ;
            }
        }
    }

    public createTaskName(task: string, project?: string) : string {
        let ret: string = task ;
        if (project) {
            ret = task + " " + project ;
        }

        return ret ;
    }

    public reset() : void {
        this.tasks_ = [] ;
        this.valid_ = true ;
    }

    public isValid() : boolean {
        return this.valid_ ;
    }

    public writeTasks() {
        if (!this.valid_) {
            return ;
        }

        let taskobj = {
            "version" : "2.0.0",
            "tasks" : this.tasks_
        } ;

        let contents = JSON.stringify(taskobj, null, 4) ;
        fs.writeFileSync(this.filename_, contents) ;
    }

    public addAll() {
        let ninja = MTBExtensionInfo.getMtbExtensionInfo().isNinjaValid ;

        if (this.appinfo_.appType === AppType.combined) {
            this.addRebuild() ;
            if (ninja) {
                this.addRebuildNinja() ;
            }
            this.addClean() ;
            this.addBuild() ;
            if (ninja) {
                this.addBuildNinja() ;
            }
            this.addBuildProgram() ;
            if (ninja) {
                this.addBuildProgramNinja() ;
            }
            this.addProgram() ;
            this.addErase(this.appinfo_.projects[0].name);
        }
        else {
            this.addRebuild() ;
            if (ninja) {
                this.addRebuildNinja() ;
            }
            this.addClean() ;
            this.addBuild() ;
            if (ninja) {
                this.addBuildNinja() ;
            }            
            this.addBuildProgram() ;
            if (ninja) {
                this.addBuildProgramNinja() ;
            }
            this.addProgram() ;
            this.addErase(this.appinfo_.projects[0].name) ;  
            for(let project of this.appinfo_.projects) {
                this.addRebuild(project.name) ;
                if (ninja) {
                    this.addRebuildNinja(project.name) ;
                }
                this.addClean(project.name) ;
                this.addBuild(project.name) ;
                if (ninja) {
                    this.addBuildNinja(project.name) ;
                }
                this.addProgram(project.name) ;
                this.addBuildProgram(project.name) ;
                if (ninja) {
                    this.addBuildProgramNinja(project.name) ;
                } 
            }
        }
    }

    public addRebuildNinja(project?: string) {
        let labelstr: string ;

        labelstr = this.createTaskName(MTBTasks.taskNameRebuildNinja, project) ;

        if (!this.doesTaskExist(labelstr)) {
            let cleanstr = this.createTaskName(MTBTasks.taskNameClean, project) ;
            let buildstr = this.createTaskName(MTBTasks.taskNameBuildNinja, project) ;
            let task =  {
                "label": labelstr,
                "dependsOrder": "sequence",
                "dependsOn": [ cleanstr, buildstr],
                "group": {
                    "kind": "build",
                    "isDefault": true
                }
            } ;
            if (project) {
                let loose: LooseObject = task ;
                loose.hide = true ;
            }
            this.tasks_.push(task) ;
        }
    }    

    public addRebuild(project?: string) {
        let labelstr: string  = this.createTaskName(MTBTasks.taskNameRebuild, project) ;

        if (!this.doesTaskExist(labelstr)) {
            let cleanstr = this.createTaskName(MTBTasks.taskNameClean, project) ;
            let buildstr = this.createTaskName(MTBTasks.taskNameBuild, project) ;

            let task =  {
                "label": labelstr,
                "dependsOrder": "sequence",
                "dependsOn": [ cleanstr, buildstr],
                "group": {
                    "kind": "build",
                    "isDefault": true
                }
            } ;
            if (project) {
                let loose: LooseObject = task ;
                loose.hide = true ;
            }
            this.tasks_.push(task) ;
        }
    }
    
    public addClean(project?: string) {
        this.addMakeTask(false, MTBTasks.taskNameClean, "clean", "", [], project, false, false) ;
    }

    public addBuild(project?: string) {
        this.addMakeTask(true, MTBTasks.taskNameBuild, "-j build", "", "$gcc", project, false, false) ;
    }

    public addBuildNinja(project?: string) {
        this.addMakeTask(true, MTBTasks.taskNameBuildNinja, "build", "NINJA=1", "$gcc", project, false, false) ;
    }    

    public addProgram(project?: string) {
        this.addMakeTask(false, MTBTasks.taskNameProgram, "qprogram", "", [], project, true, false) ;
    }

    public addBuildProgram(project?: string) {
        this.addMakeTask(false, MTBTasks.taskNameBuildProgram, "-j program", "", [], project, true, false) ;
    }

    public addBuildProgramNinja(project?: string) {
        this.addMakeTask(false, MTBTasks.taskNameBuildProgramNinja, "program", "NINJA=1", [], project, true, false) ;
    }       

    public addErase(project?: string) {
        this.addMakeTask(false, MTBTasks.taskNameErase, "erase", "", [], project, true, true) ;
    }    

    //
    // If hide is true, override the logic assocaited with projects and hide the task regardless
    // If erase is true, do not add the project to the label and the string _proj to the target
    //
    public addMakeTask(build: boolean, label: string, cmd: string, args: string, matcher: any, project?: string, hide: boolean = false, erase: boolean = false) {
        let unixarg: string ;
        let winarg: string ;
        let labelstr: string ;
        let targetstr: string ;

        if (project) {
            if (!erase && project) {
                labelstr = this.createTaskName(label, project) ;
                targetstr = cmd + "_proj " + args ;
            }
            else {
                labelstr = label ;
                targetstr = cmd + " " + args ;
            }
        }
        else {
            labelstr = label ;
            targetstr = cmd + " " + args ;
        }

        if (this.doesTaskExist(labelstr)) {
            return ;
        }

        if (project) {
            winarg = "export PATH=/bin:/usr/bin:$PATH ; cd " + project + "; ${config:modustoolbox.toolsPath}/modus-shell/bin/make.exe " + targetstr ;
        }
        else {
            winarg = "export PATH=/bin:/usr/bin:$PATH ; ${config:modustoolbox.toolsPath}/modus-shell/bin/make.exe " + targetstr ;
        }

        if (project) {
            unixarg = "cd " + project + " ; make " + cmd ;
        }
        else {
            unixarg = "make " + cmd ;
        }

        let task =  {
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
            "problemMatcher": matcher
        } ;

        let loose: LooseObject = task ;        
        if (project || hide === true) {
            loose.hide = true ;
        }

        if (build) {
            loose.group = {
                "kind": "build",
                "isDefault": true            
            } ;
        }
        this.tasks_.push(task) ;        
    }

    public doesTaskExist(label: string) {
        let found = false ;
        for (let task of this.tasks_) {
            if (task.label === label) {
                found = true ;
                break ;
            }
        }
        return found ;
    }

    public areWeMissingTasks() : boolean {
        let ninja = MTBExtensionInfo.getMtbExtensionInfo().isNinjaValid ;

        if (this.appinfo_.appType === AppType.combined) {
            if (!this.doesTaskExist(MTBTasks.taskNameRebuild) || !this.doesTaskExist(MTBTasks.taskNameClean) || !this.doesTaskExist(MTBTasks.taskNameBuild) ||
                !this.doesTaskExist(MTBTasks.taskNameProgram) || !this.doesTaskExist(MTBTasks.taskNameErase) || !this.doesTaskExist(MTBTasks.taskNameBuildProgram)) {
                return true ;
            }

            if (ninja && (!this.doesTaskExist(MTBTasks.taskNameRebuildNinja) || !this.doesTaskExist(MTBTasks.taskNameBuildNinja) || !this.doesTaskExist(MTBTasks.taskNameBuildProgram))) {
                return true ;
            }
        }
        else {
            if (!this.doesTaskExist(MTBTasks.taskNameRebuild) || !this.doesTaskExist(MTBTasks.taskNameClean) || !this.doesTaskExist(MTBTasks.taskNameBuild) && 
                !this.doesTaskExist(MTBTasks.taskNameProgram) && !this.doesTaskExist(MTBTasks.taskNameErase) && !this.doesTaskExist(MTBTasks.taskNameBuildProgram)) {
                return true ;
            }

            if (ninja && (!this.doesTaskExist(MTBTasks.taskNameRebuildNinja) || !this.doesTaskExist(MTBTasks.taskNameBuildNinja) || !this.doesTaskExist(MTBTasks.taskNameBuildProgramNinja))) {
                return true ;
            }        

            for(let projobj of this.appinfo_.projects) {
                let project = projobj.name ;
                if (!this.doesTaskExist(this.createTaskName(MTBTasks.taskNameRebuild, project)) || !this.doesTaskExist(this.createTaskName(MTBTasks.taskNameClean, project)) 
                    || !this.doesTaskExist(this.createTaskName(MTBTasks.taskNameBuild, project)) || !this.doesTaskExist(this.createTaskName(MTBTasks.taskNameProgram, project))
                    || !this.doesTaskExist(this.createTaskName(MTBTasks.taskNameBuildProgram, project))) {
                    return true ;
                }

                if (ninja && (!this.doesTaskExist(this.createTaskName(MTBTasks.taskNameRebuildNinja, project)) || !this.doesTaskExist(this.createTaskName(MTBTasks.taskNameBuildNinja,project)) 
                    || !this.doesTaskExist(this.createTaskName(MTBTasks.taskNameBuildProgramNinja, project)))) {
                    return true ;
                }
            }
        }

        return false ;
    }
}

