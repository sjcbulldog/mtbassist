import { MTBSettings } from "../extobj/mtbsettings";
import { MTBProjectInfo } from "../mtbenv/appdata/mtbprojinfo";
import { ModusToolboxEnvironment } from "../mtbenv/mtbenv/mtbenv";
import { VSCodeTaskGenerator } from "./vscodetaskgen";

export class VSCodeProjTaskGenerator extends VSCodeTaskGenerator {

    // The tasks required at the project level
    private static projectTasks: string[] = [
        VSCodeTaskGenerator.taskNameRebuild,
        VSCodeTaskGenerator.taskNameClean,
        VSCodeTaskGenerator.taskNameBuild,
        VSCodeTaskGenerator.taskNameBuildProgram,
        VSCodeTaskGenerator.taskNameQuickProgram,
        VSCodeTaskGenerator.taskNameBuildApplication
    ] ;

    private proj_: MTBProjectInfo;

    public constructor(env: ModusToolboxEnvironment, settings: MTBSettings, proj: MTBProjectInfo) {
        super(env, settings) ;
        this.proj_ = proj;
    }

    public getRequiredTasks(): string[] {
        let ret: string[] = [] ;
        for(let t of VSCodeProjTaskGenerator.projectTasks) {
            if (t === VSCodeTaskGenerator.taskNameBuildApplication) {
                ret.push(t) ;
            }
            else {
                ret.push(this.createTaskName(t, this.proj_.name)) ;
            }
        }

        return ret ;
    }

    public generateTask(fullTaskName: string): any {
        let ret = undefined ;
        let words = fullTaskName.split(':') ;
        let taskname = words[0] ;

        switch(taskname) {
        case VSCodeProjTaskGenerator.taskNameRebuild:
            ret = this.generateRebuild() ;
            break ;
        case VSCodeProjTaskGenerator.taskNameBuild:
            ret = this.generateMakeTask(fullTaskName, "build", "", true, this.proj_.name) ;
            break ;
        case VSCodeProjTaskGenerator.taskNameClean:
            ret = this.generateMakeTask(fullTaskName, "clean", "", false, this.proj_.name) ;
            break ;
        case VSCodeProjTaskGenerator.taskNameBuildProgram:
            ret = this.generateMakeTask(fullTaskName, "program", "", true, this.proj_.name) ;
            break ;
        case VSCodeProjTaskGenerator.taskNameQuickProgram:
            ret = this.generateMakeTask(fullTaskName, "qprogram", "", false, this.proj_.name) ;
            break ;
        case VSCodeProjTaskGenerator.taskNameBuildApplication:
            ret = this.generateMakeTask(taskname, "build", "", true) ;
            break ;

        default:
            throw new Error(`Unsupported project level task ${taskname}`) ;
        }   
        return ret ;
    }

    protected isBuildTask(taskname: string): boolean {
        return taskname === VSCodeTaskGenerator.taskNameBuild || taskname === VSCodeTaskGenerator.taskNameBuildApplication || taskname === VSCodeTaskGenerator.taskNameBuildProgram ;
    }

    private generateRebuild() : any {
        let labelstr: string  = this.createTaskName(VSCodeProjTaskGenerator.taskNameRebuild, this.proj_.name) ;

        let cleanstr = this.createTaskName(VSCodeProjTaskGenerator.taskNameClean, this.proj_.name) ;
        let buildstr = this.createTaskName(VSCodeProjTaskGenerator.taskNameBuild, this.proj_.name) ;

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
