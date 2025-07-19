import { MTBVersion } from "../misc/mtbversion";
export declare class MTBInstance {
    private static readonly versionXMLRegEx;
    private static readonly versionTXTRegEx;
    private rootdir_?;
    private version_?;
    private props_;
    private name_?;
    private id_?;
    protected props_obj_: any;
    constructor(rootdir: string);
    get name(): string | undefined;
    get rootdir(): string | undefined;
    get version(): MTBVersion | undefined;
    get id(): string | undefined;
    protected set version(v: MTBVersion);
    get props(): Map<string, any>;
    private computeAssetName;
    private init;
    private readPropsFile;
}
//# sourceMappingURL=mtbinstance.d.ts.map