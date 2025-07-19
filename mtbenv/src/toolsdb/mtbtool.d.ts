import { MTBVersion } from "../misc/mtbversion";
import { MTBToolSource } from "./toolsdb";
export interface MTBOptProgramCodeGen {
    name: string;
    sources: string[];
    outputs: string[];
    args: string;
    passes: string[];
}
export interface MTBOptProgram {
    id: string;
    'short-name': string;
    exe: string;
    icon: string;
    'display-name': string;
    'priority-extensions'?: string[];
    extensions?: string[];
    'open-file'?: string;
    'new-file'?: string;
    'make-vars'?: any;
    type: string;
    'code-gen'?: MTBOptProgramCodeGen[];
    'app-make-targets'?: string[];
    'prj-make-targets'?: string[];
    compat: {
        open?: {
            EXT: string;
            FILE: string;
            TOOL: string;
            TOOL_FLAGS: string;
            TOOL_NEWCFG_FLAGS: string;
        };
    };
}
export interface MTBToolProps {
    core: {
        id: string;
        name: string;
        version: string;
    };
    opt: {
        tool: any;
        programs: MTBOptProgram[];
    };
}
export declare class MTBTool {
    private path_;
    private props_;
    private src_;
    private version_;
    constructor(path: string, props: MTBToolProps, src: MTBToolSource);
    get programs(): MTBOptProgram[];
    get hasCodeGenerator(): boolean;
    get source(): MTBToolSource;
    get path(): string;
    get id(): string;
    get version(): MTBVersion;
}
//# sourceMappingURL=mtbtool.d.ts.map