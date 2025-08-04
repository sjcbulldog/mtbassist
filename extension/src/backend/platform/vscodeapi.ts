import { PlatformType } from "../../comms";
import { ModusToolboxEnvironment } from "../../mtbenv/mtbenv/mtbenv";
import { PlatformAPI } from "./platformapi";
import * as path from 'path';
import * as fs from 'fs';

export class VSCodeAPI implements PlatformAPI {
    private static projectCreatorToolUuid = '9aac89d2-e375-474f-a1cd-79caefed2f9c' ;
    private static projectCreatorCLIName = 'project-creator-cli' ;

    private env_: ModusToolboxEnvironment;
    
    public constructor(env: ModusToolboxEnvironment) {
        this.env_ = env;
    }

    public getPlatform(): PlatformType {
        return 'vscode';
    }

    createProject(projdir: string, appdir: string, bspid: string, ceid: string): Promise<[number, string[]]> {
        return new Promise<[number, string[]]>((resolve, reject) => {
            let cliPath = this.findProjectCreatorCLIPath();
            if (cliPath === undefined) {
                resolve([-1, ["project creator CLI not found."]]) ;
            }
            else {
                ModusToolboxEnvironment.runCmdCaptureOutput(projdir, cliPath, ['-b', bspid, '-a', ceid])
                .then((result) => {
                    resolve([0, [`Project '${bspid} - ${ceid}' created successfully.`]]);
                })
                .catch((error) => {
                    resolve([-1, [`Failed to create project '${bspid} - ${ceid}': ${error.message}`]]);
                });
            }
        });
    } 

    private findProjectCreatorCLIPath() : string | undefined {
        let tool = this.env_.toolsDB.findToolByGUID(VSCodeAPI.projectCreatorToolUuid);
        if (tool === undefined) {
            return undefined;
        }

        let p = path.join(tool.path, VSCodeAPI.projectCreatorCLIName);
        if (fs.existsSync(p)) {
            return p;
        }
        return undefined;
    }
}