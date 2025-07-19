import { MTBTool } from "./mtbtool";
import { MTBPack } from "../packdb/mtbpack";
import winston from "winston";
export declare enum MTBToolSource {
    TechPack = "tech-pack",
    Eap = "early-access-pack",
    ToolsDir = "tools-dir",
    IDC = "idc"
}
export interface MTBToolDir {
    dir: string;
    source: MTBToolSource;
}
export declare class ToolsDB {
    private tools_dirs_;
    private active_tools_;
    private tools_;
    constructor();
    get activeSet(): MTBTool[];
    addToolsDir(dir: MTBToolDir): void;
    findToolByGUID(guid: string): MTBTool | undefined;
    scanAll(logger: winston.Logger): Promise<void>;
    setActiveToolSet(eap: MTBPack | undefined): void;
    private scanForTools;
    private scanForTool;
}
//# sourceMappingURL=toolsdb.d.ts.map