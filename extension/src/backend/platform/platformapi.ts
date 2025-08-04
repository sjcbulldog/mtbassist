import { PlatformType } from "../../comms";

export interface PlatformAPI {
    getPlatform() : PlatformType ;
    createProject(projdir: string, appdir: string, bspid: string, ceid: string): Promise<[number, string[]]>;
    loadWorkspace(p: string): Promise<void>;
}
