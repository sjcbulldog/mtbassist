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

import * as fs from 'fs' ;
import { ModusToolboxEnvironment } from '../mtbenv';
import { ApplicationType } from '../mtbenv/appdata/mtbappinfo';
import * as winston from 'winston';
import { MTBVSCodeTaskStatus } from '../comms';

interface LooseObject {
    [key: string]: any
}

export class MTBTasks
{
    public static taskNameBuild = "Build" ;
    public static taskNameRebuild = "Rebuild" ;
    public static taskNameErase = "Erase" ;
    public static taskNameQuickProgram = "Quick Program" ;
    public static taskNameClean = "Clean" ;
    public static taskNameBuildProgram = "Build & Program" ;

    private static appTaskNames: any[] = [ 
        MTBTasks.taskNameRebuild,
        MTBTasks.taskNameClean,
        MTBTasks.taskNameBuild,
        MTBTasks.taskNameErase,                     // Skip if in a project
        MTBTasks.taskNameBuildProgram,
        MTBTasks.taskNameQuickProgram
    ] ;

    private filename_ : string ;
    private tasks_ : any [] = [] ;
    private valid_: boolean = false ;
    private env_ : ModusToolboxEnvironment ;
    private logger_ : winston.Logger ;
    private taskFileStatus_: MTBVSCodeTaskStatus = 'good' ;

    private static validVersion = "2.0.0" ;

    constructor(env: ModusToolboxEnvironment, logger: winston.Logger, filename: string) {
        this.filename_ = filename ;
        this.env_ = env ;
        this.logger_ = logger ;
        this.processTasksFile() ;
    }

    public get taskFileStatus() : MTBVSCodeTaskStatus {
        this.processTasksFile() ;
        return this.taskFileStatus_ ;
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
        let taskobj = {
            "version" : "2.0.0",
            "tasks" : this.tasks_
        } ;

        let contents = JSON.stringify(taskobj, null, 4) ;
        fs.writeFileSync(this.filename_, contents) ;
        this.taskFileStatus_ = 'good' ;
    }

    public clear() {
        this.tasks_ = [];
    }

    public addAll() {
        if (!this.env_.appInfo) {
            return;
        }

        for(let taskname of MTBTasks.appTaskNames) {
            this.addTask(taskname) ;
        }        

        if (this.env_.appInfo.type() === ApplicationType.application) {
            for(let project of this.env_.appInfo.projects) {
                for(let taskname of MTBTasks.appTaskNames) {                
                    if (taskname.indexOf(MTBTasks.taskNameErase) !== -1) {
                        continue ;
                    }
                    this.addTask(taskname, project.name) ;
                }
            }
        }
    }

    public doesTaskExist(label: string) : boolean {
        for (let task of this.tasks_) {
            if (task.label === label) {
                return true ;
            }
        }
        return false ;
    }  

    public doWeNeedTaskUpdates() : boolean {
        let ret: boolean = false ;
        let ninja = true ;

        for(let taskname of MTBTasks.appTaskNames) {
            if (taskname.indexOf("ninja") !== -1 && !ninja) {
                continue ;
            }
            
            let task = this.needToAddChangeTask(taskname, undefined, true) ;
            if (task) {
                if (task.missing) {
                    this.logger_.info(`task '${task.label}' is missing`) ;
                }
                else {
                    this.logger_.info(`task '${task.label}' is different than expected`) ;
                    let curstr: string = task.other ;
                    task.missing = undefined ;
                    task.other = undefined ;
                    this.logger_.info(`    expected '${JSON.stringify(task)}'`) ;
                    this.logger_.info(`    existing '${curstr}'`) ;
                }
                ret = true ;
            }
        }

        if (this.env_.appInfo?.type() === ApplicationType.application) {
            for(let project of this.env_.appInfo.projects) {
                for(let taskname of MTBTasks.appTaskNames) {
                    if (taskname.indexOf("ninja") !== -1 && !ninja) {
                        continue ;
                    }

                    if (taskname.indexOf(MTBTasks.taskNameErase) !== -1) {
                        continue ;
                    }

                    let task = this.needToAddChangeTask(taskname, project.name, true) ;
                    if (task) {
                        if (task.missing) {
                            this.logger_.info(`task '${task.label}' is missing`) ;
                        }
                        else {
                            this.logger_.info(`task '${task.label}' is different than expected`) ;
                            let curstr: string = task.other ;
                            task.missing = undefined ;
                            task.other = undefined ;
                            this.logger_.info(`    expected '${JSON.stringify(task)}'`) ;
                            this.logger_.info(`    existing '${curstr}'`) ;
                        }
                        ret = true ;
                    }
                }
            }
        }

        return ret ;
    }

    private processTasksFile() : void {
        if (fs.existsSync(this.filename_)) {
            this.initFromFile() ;
            if (!this.valid_) {
                this.taskFileStatus_ = 'corrupt' ;
            }
            else if (this.doWeNeedTaskUpdates()) {
                this.taskFileStatus_ = 'needsTasks' ;
            }
            else {
                this.taskFileStatus_ = 'good' ;
            }
        }
        else {
            this.taskFileStatus_ = 'missing' ;
        }
    }    

    private initFromFile() {
        let taskdata = fs.readFileSync(this.filename_, 'utf8') ;
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

    private generateBuild() : any {
        let labelstr: string ;

        let depends: any[] = [] ;
        for(let project of this.env_.appInfo!.projects) {
            let taskname = this.createTaskName(MTBTasks.taskNameBuild, project.name) ;
            depends.push(taskname) ;
        }
        let task =  {
            "label": MTBTasks.taskNameBuild,
            "dependsOrder": "sequence",
            "dependsOn": depends,
            "group": {
                "kind": "build",
                "isDefault": true
            }
        } ;

        return task ;
    }     

    private generateRebuild(project?: string) : any {
        let labelstr: string  = this.createTaskName(MTBTasks.taskNameRebuild, project) ;

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

        return task ;
    }

    private genToolsPath() : string {
        return `export CY_TOOLS_PATHS=\${config:modustoolbox.toolsPath} ;` ;
    }

    //
    // If hide is true, override the logic assocaited with projects and hide the task regardless
    // If erase is true, do not add the project to the label and the string _proj to the target
    //
    private generateMakeTask(build: boolean, label: string, cmd: string, args: string, matcher: boolean, project?: string, hide: boolean = false, erase: boolean = false) : any {
        let unixarg: string ;
        let winarg: string ;
        let labelstr: string ;
        let targetstr: string ;

        if (project) {
            labelstr = this.createTaskName(label, project) ;
            targetstr = cmd + "_proj " + args ;
        }
        else {
            labelstr = label ;
            targetstr = cmd + " " + args ;
        }

        if (project) {
            winarg = `export PATH=/bin:/usr/bin:$PATH ; ${this.genToolsPath()} cd ${project} ; \${config:modustoolbox.toolsPath}/modus-shell/bin/make.exe ${targetstr} `;
        }
        else {
            winarg = `export PATH=/bin:/usr/bin:$PATH ; ${this.genToolsPath()} \${config:modustoolbox.toolsPath}/modus-shell/bin/make.exe ${targetstr} `;
        }

        if (project) {
            unixarg = `${this.genToolsPath() } cd ${project} ; make ${targetstr} `;
        }
        else {
            unixarg = `${this.genToolsPath() } make ${targetstr} `;
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
        } ;

        if (matcher) {
            let loose: LooseObject = task ;

            if (project) {
                let matchobj = {
                    "base" : "$gcc",
                    "fileLocation" : ["relative", "${workspaceRoot}/" + project]
                } ;
                loose.problemMatcher = matchobj ;                
            }
            else {
                let matchstr: string = "$gcc" ;
                loose.problemMatcher = "$gcc" ;
            }
        }

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

        return task ;
    }

    private getTaskByName(label: string) : any | undefined {
        for (let task of this.tasks_) {
            if (task.label === label) {
                return task ;
            }
        }
        return undefined ;
    }    

    private addOrReplaceTask(task: any) {
        let index : number = -1 ;
        for (let i:number = 0 ; i < this.tasks_.length ; i++) {
            if (this.tasks_[i].label === task.label) {
                index = i ;
                break ;
            }
        }

        if (index !== -1) {
            this.tasks_[index] = task ;
        }
        else {
            this.tasks_.push(task) ;
        }
    }

    private generateTask(taskname: string, project?: string) : any | undefined {
        let task: any | undefined ;

        if (taskname === MTBTasks.taskNameRebuild) {
            task = this.generateRebuild(project) ;
        }
        else if (taskname === MTBTasks.taskNameClean) {
            task = this.generateMakeTask(false, MTBTasks.taskNameClean, "clean", "", false, project, false, false) ;
        }
        else if (taskname === MTBTasks.taskNameBuild) {
            if (project === undefined && this.env_.appInfo?.type() === ApplicationType.application) {
                task = this.generateMakeTask(true, MTBTasks.taskNameBuild, "-j build", "", true, project, false, false) ;
            }
            else {
                task = this.generateMakeTask(true, MTBTasks.taskNameBuild, "-j build", "", true, project, false, false) ;
            }
        }
        else if (taskname === MTBTasks.taskNameErase) {
            task =  this.generateMakeTask(false, MTBTasks.taskNameErase, "erase", "", false, project, true, true) ;
        }
        else if (taskname === MTBTasks.taskNameBuildProgram) {
            task = this.generateMakeTask(false, MTBTasks.taskNameBuildProgram, "-j program", "", true, project, true, false) ;
        }
        else if (taskname === MTBTasks.taskNameQuickProgram) {
            task =  this.generateMakeTask(false, MTBTasks.taskNameQuickProgram, "qprogram", "", false, project, true, true) ;            
        }
        
        return task ;
    }

    private addTask(taskname: string, project?: string) {
        let task = this.needToAddChangeTask(taskname, project, false) ;
        if (task) {
            this.addOrReplaceTask(task) ;
        }
    }

    private needToAddChangeTask(taskname: string, project?: string, addreason?:boolean) : any | undefined {
        let ret = undefined ;

        let task = this.generateTask(taskname, project) ;
        if (task) {
            let existing = this.getTaskByName(this.createTaskName(taskname, project)) ;
            if (!existing) {
                ret = task ;
                if (addreason) {
                    ret.missing = true ;
                }
            }
            else {
                if (!this.compareTasks(task, existing)) {
                    ret = task ;
                    if (addreason) {
                        ret.missing = false ;
                        ret.other = JSON.stringify(existing) ;
                    }
                }
            }
        }

        return ret;
    }

    private compareTasks(task1: any, task2: any) {
        let a: string = JSON.stringify(task1) ;
        let b: string = JSON.stringify(task2) ;
        let ret: boolean = (a === b);

        return ret ;
    }
}

