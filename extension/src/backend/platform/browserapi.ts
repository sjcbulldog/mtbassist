import { PlatformType } from "../../comms";
import { PlatformAPI } from "./platformapi";

export class BrowserAPI implements PlatformAPI {
    public getPlatform(): PlatformType {
        return 'browser';
    }

    public createProject(projdir: string, bspid: string, ceid: string): Promise<[number, string[]]> {
        return new Promise<[number, string[]]>((resolve, reject) => {
            // Simulate project creation
            setTimeout(() => {
                resolve([0, [`Project '${bspid} - ${ceid}' created successfully.`]]);
            }, 1000);
        });
    }    
}
    