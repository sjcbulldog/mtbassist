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
import * as path from 'path' ;
import * as winston from 'winston';
import { MTBVSCodeTaskStatus } from '../comms';
import { VSCodeTaskGenerator } from './vscodetaskgen';

export class VSCodeTasks
{
    private filename_ : string ;
    private tasks_ : any [] = [] ;
    private valid_: boolean = false ;
    private logger_ : winston.Logger ;
    private taskFileStatus_: MTBVSCodeTaskStatus = 'good' ;
    private taskGenerator_ : VSCodeTaskGenerator  ;

    constructor(logger: winston.Logger, filename: string, gen: VSCodeTaskGenerator) {
        this.filename_ = filename ;
        this.logger_ = logger ;
        this.taskGenerator_ = gen ;
        this.processTasksFile() ;
    }

    public get taskFileStatus() : MTBVSCodeTaskStatus {
        this.processTasksFile() ;
        return this.taskFileStatus_ ;
    }

    public reset() : void {
        this.tasks_ = [] ;
        this.valid_ = true ;
    }

    public isValid() : boolean {
        return this.valid_ ;
    }

    private writeTasks() {
        let taskobj = {
            "version" : "2.0.0",
            "tasks" : this.tasks_
        } ;

        let contents = JSON.stringify(taskobj, null, 4) ;
        let dirname = path.dirname(this.filename_) ;
        if (!fs.existsSync(dirname)) {
            fs.mkdirSync(dirname, { recursive: true }) ;
        }
        fs.writeFileSync(this.filename_, contents) ;
        this.taskFileStatus_ = 'good' ;
    }

    public clear() {
        this.tasks_ = [];
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

        let tasklist = this.taskGenerator_.getRequiredTasks() ;
        for(let taskname of tasklist) {
            let task = this.needToAddChangeTask(taskname, true) ;
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

        return ret ;
    }

    public addRequiredTasks() : void {
        for(let taskname of this.taskGenerator_.getRequiredTasks()) {
            let task = this.needToAddChangeTask(taskname, false) ;
            if (task) {
                this.addOrReplaceTask(task) ;
            }
        }
        this.writeTasks() ;
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

    private getTaskByName(label: string) : any | undefined {
        for (let task of this.tasks_) {
            if (task.label === label) {
                return task ;
            }
        }
        return undefined ;
    }

    private needToAddChangeTask(taskname: string, addreason?:boolean) : any | undefined {
        let ret = undefined ;

        let task = this.taskGenerator_.generateTask(taskname) ;
        if (task) {
            let existing = this.getTaskByName(taskname) ;
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

    private compareTasks(task1: any, task2: any) {
        let a: string = JSON.stringify(task1) ;
        let b: string = JSON.stringify(task2) ;
        let ret: boolean = (a === b);

        return ret ;
    }    
}

