import * as path from 'path' ;
import * as fs from 'fs' ;

interface LooseObject {
    [key: string]: any
}

export class MTBTasks
{
    private filename_ : string ;
    private projects_ : string[] ;
    private tasks_ : any [] = [] ;
    private valid_: boolean = false ;

    constructor(filename: string, projects: string[]) {
        this.projects_ = projects ;

        this.filename_ = filename ;
        if (fs.existsSync(filename)) {
            let taskdata = fs.readFileSync(filename, 'utf8') ;
            taskdata = taskdata.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
            let file = JSON.parse(taskdata) ;
            this.tasks_ = file.tasks ;
        }

        this.valid_ = true ;
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
        if (this.projects_.length > 0) {
            this.addRebuild() ;
            this.addClean() ;
            this.addBuild() ;
            this.addProgram() ;      
            this.addErase(this.projects_[0]) ;  
            for(let project of this.projects_) {
                this.addRebuild(project) ;
                this.addClean(project) ;
                this.addBuild(project) ;
                this.addProgram(project) ;
            }
        }
    }

    public addRebuild(project?: string) {
        let labelstr: string ;

        if (project) {
            labelstr = "Rebuild " + project ;
        }
        else {
            labelstr = "Rebuild" ;
        }

        if (!this.doesTaskExist(labelstr)) {
            let task =  {
                "label": labelstr,
                "dependsOrder": "sequence",
                "dependsOn": [
                    (project ? "Clean " + project : "Clean"),
                    (project ? "Build " + project : "Build"),
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
        this.addMakeTask("Clean", "clean", [], project, false, false) ;
    }

    public addBuild(project?: string) {
        this.addMakeTask("Build", "-j build", "$gcc", project, false, false) ;
    }

    public addProgram(project?: string) {
        this.addMakeTask("Program", "qprogram", [], project, true, false) ;
    }

    public addErase(project: string) {
        this.addMakeTask("Erase", "erase", [], project, true, true) ;
    }    

    //
    // If hide is true, override the logic assocaited with projects and hide the task regardless
    // If erase is true, do not add the project to the label and the string _proj to the target
    //
    public addMakeTask(label: string, target: string, matcher: any, project?: string, hide: boolean = false, erase: boolean = false) {
        let arg: string ;
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

        if (process.platform === "win32") {
            if (project) {
                arg = "export PATH=/bin:/usr/bin:$PATH ; cd " + project + "; ${config:modustoolbox.toolsPath}/modus-shell/bin/make.exe " + targetstr ;
            }
            else {
                arg = "export PATH=/bin:/usr/bin:$PATH ; ${config:modustoolbox.toolsPath}/modus-shell/bin/make.exe " + targetstr ;
            }
        }
        else {
            if (project) {
                arg = "cd " + project + " ; make " + target ;
            }
            else {
                arg = "make " + target ;
            }
        }
        let task =  {
            "label": labelstr,
            "type": "process",
            "command": "bash",
            "args": [
                "--norc",
                "-c",
                arg
            ],

            "windows" : {
                "command": "${config:modustoolbox.toolsPath}/modus-shell/bin/bash.exe",
                "args": [
                    "--norc",
                    "-c",
                    arg
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
        if (!this.doesTaskExist("Rebuild") || !this.doesTaskExist("Clean") || !this.doesTaskExist("Build") && !this.doesTaskExist("Program") && !this.doesTaskExist("Erase")) {
            return true ;
        }

        for(let project of this.projects_) {
            if (!this.doesTaskExist("Rebuild " + project) || !this.doesTaskExist("Clean " + project) || !this.doesTaskExist("Build " + project) || !this.doesTaskExist("Program " + project)) {
                return true ;
            }
        }

        return false ;
    }
}

