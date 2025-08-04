import { PlatformType } from "../../comms";

export interface PlatformAPI {
    getPlatform() : PlatformType ;
    createProject(projdir: string, bspid: string, ceid: string): Promise<[number, string[]]>;
}
