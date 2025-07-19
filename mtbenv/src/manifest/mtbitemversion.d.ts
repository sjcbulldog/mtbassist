export declare class MTBItemVersionDependency {
    readonly id: string;
    readonly commit: string;
    constructor(id: string, commit: string);
}
export declare class MTBItemVersion {
    readonly num: string;
    readonly commit: string;
    requirements: string[];
    flows: string[];
    toolsMinVersion: string | undefined;
    dependencies: MTBItemVersionDependency[];
    constructor(num: string, commit: string);
    setRequirements(reqs: string[]): void;
    setFlows(flows: string[]): void;
    setMinToolsVersion(mintools: string | undefined): void;
    addDependency(id: string, commit: string): void;
}
//# sourceMappingURL=mtbitemversion.d.ts.map