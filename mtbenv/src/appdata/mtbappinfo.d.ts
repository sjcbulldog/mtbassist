import { ModusToolboxEnvironment } from "../mtbenv/mtbenv";
import { MTBProjectInfo } from "./mtbprojinfo";
import winston from 'winston';
export declare enum ApplicationType {
    Unknown = 0,
    Combined = 1,
    Application = 2
}
export declare class MTBAppInfo {
    private static app_required_vars_;
    private type_;
    private appdir_;
    private env_;
    private projects_;
    private vars_?;
    constructor(env: ModusToolboxEnvironment, appdir: string);
    setVars(vars: Map<string, string>): void;
    setType(type: ApplicationType): void;
    type(): ApplicationType;
    load(logger: winston.Logger): Promise<void>;
    get appdir(): string;
    get bspdir(): string;
    addProject(proj: MTBProjectInfo): void;
    get projects(): MTBProjectInfo[];
    get loadedProjectCount(): number;
    get totalProjectCount(): number;
    isValid(): Error | undefined;
}
//# sourceMappingURL=mtbappinfo.d.ts.map