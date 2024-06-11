import * as path from 'path' ;
import * as fs from 'fs' ;
import { AppType, MTBAppInfo } from './mtbappinfo';

interface LooseObject {
    [key: string]: any
}

export class MTBTasks
{
    public static taskNameBuild = "Build" ;
    public static taskNameRebuild = "Rebuild" ;
    public static taskNameErase = "Erase" ;
    public static taskNameProgram = "Program" ;
    public static taskNameClean = "Clean" ;
    public static taskNameBuildProgram = "Build & Program" ;

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
        if (this.appinfo_.appType === AppType.combined) {
            this.addRebuild() ;
            this.addClean() ;
            this.addBuild() ;
            this.addBuildProgram() ;
            this.addProgram() ;
            this.addErase(this.appinfo_.projects[0].name);
        }
        else {
            this.addRebuild() ;
            this.addClean() ;
            this.addBuild() ;
            this.addBuildProgram() ;
            this.addProgram() ;
            this.addErase(this.appinfo_.projects[0].name) ;  
            for(let project of this.appinfo_.projects) {
                this.addRebuild(project.name) ;
                this.addClean(project.name) ;
                this.addBuild(project.name) ;
                this.addProgram(project.name) ;
                this.addBuildProgram(project.name) ;       
            }
        }
    }

    public addRebuild(project?: string) {
        let labelstr: string ;

        if (project) {
            labelstr = MTBTasks.taskNameRebuild + " " + project ;
        }
        else {
            labelstr = MTBTasks.taskNameRebuild ;
        }

        if (!this.doesTaskExist(labelstr)) {
            let task =  {
                "label": labelstr,
                "dependsOrder": "sequence",
                "dependsOn": [
                    (project ? MTBTasks.taskNameClean + " " + project : MTBTasks.taskNameClean),
                    (project ? MTBTasks.taskNameBuild + " "  + project : MTBTasks.taskNameBuild),
                ],
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
        this.addMakeTask(MTBTasks.taskNameClean, "clean", [], project, false, false) ;
    }

    public addBuild(project?: string) {
        this.addMakeTask(MTBTasks.taskNameBuild, "-j build", "$gcc", project, false, false) ;
    }

    public addProgram(project?: string) {
        this.addMakeTask(MTBTasks.taskNameProgram, "qprogram", [], project, true, false) ;
    }

    public addBuildProgram(project?: string) {
        this.addMakeTask(MTBTasks.taskNameBuildProgram, "-j program", [], project, true, false) ;
    }    

    public addErase(project?: string) {
        this.addMakeTask(MTBTasks.taskNameErase, "erase", [], project, true, true) ;
    }    

    //
    // If hide is true, override the logic assocaited with projects and hide the task regardless
    // If erase is true, do not add the project to the label and the string _proj to the target
    //
    public addMakeTask(label: string, target: string, matcher: any, project?: string, hide: boolean = false, erase: boolean = false) {
        let unixarg: string ;
        let winarg: string ;
        let labelstr: string ;
        let targetstr: string ;

        if (project) {
            if (!erase && project) {
                labelstr = label + " " + project ;
                targetstr = target + "_proj" ;                
            }
            else {
                labelstr = label ;
                targetstr = target ;
            }
        }
        else {
            labelstr = label ;
            targetstr = target ;
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
            unixarg = "cd " + project + " ; make " + target ;
        }
        else {
            unixarg = "make " + target ;
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
        if (project || hide === true) {
            let loose: LooseObject = task ;
            loose.hide = true ;
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
        if (this.appinfo_.appType === AppType.combined) {
            if (!this.doesTaskExist(MTBTasks.taskNameRebuild) || !this.doesTaskExist(MTBTasks.taskNameClean) || !this.doesTaskExist(MTBTasks.taskNameBuild) && 
                !this.doesTaskExist(MTBTasks.taskNameProgram) && !this.doesTaskExist(MTBTasks.taskNameErase) && !this.doesTaskExist(MTBTasks.taskNameBuildProgram)) {
                return true ;
            }
        }
        else {
            if (!this.doesTaskExist(MTBTasks.taskNameRebuild) || !this.doesTaskExist(MTBTasks.taskNameClean) || !this.doesTaskExist(MTBTasks.taskNameBuild) && 
                !this.doesTaskExist(MTBTasks.taskNameProgram) && !this.doesTaskExist(MTBTasks.taskNameErase) && !this.doesTaskExist(MTBTasks.taskNameBuildProgram)) {
                return true ;
            }

            for(let projobj of this.appinfo_.projects) {
                let project = projobj.name ;
                if (!this.doesTaskExist(MTBTasks.taskNameRebuild + " " + project) || !this.doesTaskExist(MTBTasks.taskNameClean + " " + project) 
                    || !this.doesTaskExist(MTBTasks.taskNameBuild + " " + project) || !this.doesTaskExist(MTBTasks.taskNameProgram + " " + project)
                    || !this.doesTaskExist(MTBTasks.taskNameBuildProgram + " " + project)) {
                    return true ;
                }
            }
        }

        return false ;
    }
}

