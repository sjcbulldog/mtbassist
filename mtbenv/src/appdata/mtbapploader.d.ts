import { MTBAppInfo } from "./mtbappinfo";
import winston from "winston";
export declare class MTBAppLoader {
    private app_;
    private toolsdir_;
    private modus_shell_dir_?;
    private logger_;
    constructor(logger: winston.Logger, app: MTBAppInfo, toolsdir: string);
    load(): Promise<void>;
    private setupModusShell;
    private loadCombined;
    private loadProject;
    private loadApplication;
    private processProject;
    private findMakeFile;
}
//# sourceMappingURL=mtbapploader.d.ts.map