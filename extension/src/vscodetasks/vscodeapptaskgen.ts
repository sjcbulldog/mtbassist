import { VSCodeTaskGenerator } from "./vscodetaskgen";

export class VSCodeAppTaskGenerator extends VSCodeTaskGenerator {

    // The tasks required at the application level
    private static appTasks: string[] = [
        VSCodeTaskGenerator.taskNameRebuild,
        VSCodeTaskGenerator.taskNameClean,
        VSCodeTaskGenerator.taskNameBuild,
        VSCodeTaskGenerator.taskNameEraseDevice,
        VSCodeTaskGenerator.taskNameEraseAll,
        VSCodeTaskGenerator.taskNameBuildProgram,
        VSCodeTaskGenerator.taskNameQuickProgram
    ] ;

    public getRequiredTasks(): string[] {
        return VSCodeAppTaskGenerator.appTasks ;
    }

    protected isBuildTask(taskname: string) : boolean {
        return (taskname === VSCodeAppTaskGenerator.taskNameBuild) || (taskname === VSCodeAppTaskGenerator.taskNameRebuild) || (taskname === VSCodeAppTaskGenerator.taskNameBuildProgram) ;
    }

    public generateTask(taskname: string) : any | undefined {
        let ret : any = undefined ;

        switch(taskname) {
        case VSCodeAppTaskGenerator.taskNameRebuild:
            ret = this.generateRebuild() ;
            break ;
        case VSCodeAppTaskGenerator.taskNameBuild:
            ret = this.generateMakeTask(taskname, "build", "", true, undefined) ;
            break ;
        case VSCodeAppTaskGenerator.taskNameClean:
            ret = this.generateMakeTask(taskname, "clean", "", false, undefined) ;
            break ;
        case VSCodeAppTaskGenerator.taskNameEraseDevice:
            ret = this.generateMakeTask(taskname, "erase", "", false, undefined) ;
            break ;
        case VSCodeAppTaskGenerator.taskNameEraseAll:
            ret = this.generateMakeTask(taskname, "erase", "MTB_ERASE_EXT_MEM=1", false, undefined) ;
            break ;            
        case VSCodeAppTaskGenerator.taskNameBuildProgram:
            ret = this.generateMakeTask(taskname, "program", "", true, undefined) ;
            break ;
        case VSCodeAppTaskGenerator.taskNameQuickProgram:
            ret = this.generateMakeTask(taskname, "qprogram", "", false, undefined) ;
            break ;

        default:
            throw new Error(`Unsupported application level task ${taskname}`) ;
        }
        return ret ;
    }

    private generateRebuild() : any {
        let labelstr: string  = this.createTaskName(VSCodeAppTaskGenerator.taskNameRebuild) ;

        let cleanstr = this.createTaskName(VSCodeAppTaskGenerator.taskNameClean) ;
        let buildstr = this.createTaskName(VSCodeAppTaskGenerator.taskNameBuild) ;

        let task =  {
            "label": labelstr,
            "dependsOrder": "sequence",
            "dependsOn": [ cleanstr, buildstr],
            "group": {
                "kind": "build",
                "isDefault": true
            }
        } ;
        return task ;
    }


}