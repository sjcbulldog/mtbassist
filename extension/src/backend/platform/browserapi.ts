import EventEmitter = require("events");
import { PlatformType } from "../../comms";
import { PlatformAPI } from "./platformapi";

export class BrowserAPI extends EventEmitter implements PlatformAPI {
    public getPlatform(): PlatformType {
        return 'browser';
    }

    public createProject(projdir: string, appdir: string, bspid: string, ceid: string): Promise<[number, string[]]> {
        return new Promise<[number, string[]]>((resolve, reject) => {
            // Simulate project creation
            setTimeout(() => {
                resolve([0, [`Project '${bspid} - ${ceid}' created successfully.`]]);
            }, 1000);
        });
    }    

    public fixMissingAssets(project: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Simulate fixing missing assets
            setTimeout(() => {
                console.log(`Missing assets for project '${project.name}' have been fixed.`);
                resolve();
            }, 1000);
        });
    }

    public loadWorkspace(projdir: string, projpath: string, projname: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Simulate loading a workspace
            resolve();
        });
    }
    public runAction(action: string, project: string | undefined): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Simulate running an action
            setTimeout(() => {
                console.log(`Action '${action}' has been run for project '${project}'.`);
                resolve();
            }, 1000);
        });
    }    
}
    