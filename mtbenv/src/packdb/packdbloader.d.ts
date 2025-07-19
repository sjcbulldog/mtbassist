import winston from "winston";
import { ToolsDB } from "../toolsdb/toolsdb";
import { PackDB } from "./packdb";
export declare class PackDBLoader {
    private packdb_;
    private toolsdb_;
    private logger_;
    constructor(logger: winston.Logger, db: PackDB, tdb: ToolsDB);
    scanDirectory(dir: string): Promise<void>;
    private checkOneJSONFile;
    private checkTool;
    private searchParents;
    private checkPack;
}
//# sourceMappingURL=packdbloader.d.ts.map