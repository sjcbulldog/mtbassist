import { MTBItemVersion } from "../manifest/mtbitemversion";
import { MTBVersion } from "../misc/mtbversion";
import { MTBToolSource } from "./toolsdb";

export interface MTBOptProgramCodeGen {
    name: string ;
    sources: string[] ;
    outputs: string[] ;
    args: string ;
    passes: string[] ;
}

export interface MTBOptProgram {
    id: string ;
    'short-name': string ;
    exe: string ;
    icon: string ;
    'display-name': string ;
    'priority-extensions'? : string[] ;
    extensions?: string[] ;
    'open-file'? : string ;
    'new-file'? : string ;
    'make-vars'? : any ;
    type: string ;
    'code-gen'? : MTBOptProgramCodeGen[] ;
    'app-make-targets'? : string[] ;
    'prj-make-targets'? : string[] ;
    compat: {
        open? : {
            EXT: string ;
            FILE: string ;
            TOOL: string ;
            TOOL_FLAGS: string ;
            TOOL_NEWCFG_FLAGS: string ;
        }
    }
}

export interface MTBToolProps {
    core: {
        id: string ;
        name: string ;
        version: string ;
    },
    opt: {
        tool: any ;
        programs: MTBOptProgram[] ;
    }
} ;

export class MTBTool {
    private path_: string ;
    private props_: MTBToolProps ;
    private src_: MTBToolSource ;
    private version_: MTBVersion ;

    constructor(path: string, props: MTBToolProps, src: MTBToolSource) {
        this.path_ = path ;
        this.props_ = props ;
        this.src_ = src ;

        let v = MTBVersion.fromVersionString(props.core.version) ;
        if (v === undefined) {
            throw new Error(`Invalid version string '${props.core.version}' for tool ${props.core.id}`) ;
        }
        this.version_ = v ;
    }

    public get programs() : MTBOptProgram[] {
        return this.props_.opt.programs ;
    }

    public get hasCodeGenerator() : boolean {
        return this.props_.opt.programs.some((pgm) => { 
            return pgm['code-gen'] !== undefined && pgm['code-gen'].length > 0 ;
        }) ;
    }

    public get props() : MTBToolProps {
        return this.props_ ;
    }

    public get source() : MTBToolSource {
        return this.src_ ;
    }

    public get path() : string {
        return this.path_ ;
    }

    public get id() : string {
        return this.props_.core.id ;
    }

    public get version() : MTBVersion {
        return this.version_ ;
    }
}
