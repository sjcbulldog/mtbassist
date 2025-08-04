import { PlatformType } from "../../comms";
import { PlatformAPI } from "./platformapi";

export class ElectronAPI implements PlatformAPI {
    public getPlatform(): PlatformType {
        return 'electron';
    }

    public createProject(projdir: string, appdir: string, bspid: string, ceid: string): Promise<[number, string[]]> {
        return new Promise<[number, string[]]>((resolve, reject) => {
            // Simulate project creation
            setTimeout(() => {
                resolve([0, [`Project '${bspid} - ${ceid}' created successfully.`]]);
            }, 1000);
        });
    }    

    public loadWorkspace(p: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Simulate loading a workspace
            console.log(`Loading workspace at ${p}`);
            resolve();
        });
    }
}