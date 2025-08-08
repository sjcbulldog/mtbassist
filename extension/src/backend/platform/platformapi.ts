import EventEmitter = require("events");
import { PlatformType } from "../../comms";

export interface PlatformAPI extends EventEmitter {
    getPlatform() : PlatformType ;
    createProject(projdir: string, appdir: string, bspid: string, ceid: string): Promise<[number, string[]]>;
    fixMissingAssets(project: any): Promise<void> ;
    loadWorkspace(projdir: string, projpath: string, projname: string): Promise<void>;
    runAction(action: string, project: string | undefined): Promise<void> ;
}
