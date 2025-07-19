export declare class MTBVersion {
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
    readonly build: number;
    constructor(major?: number, minor?: number, patch?: number, build?: number);
    isGreaterThen(v: MTBVersion): boolean;
    isLessThen(v: MTBVersion): boolean;
    isEqual(v: MTBVersion): boolean;
    static compare(v1: MTBVersion, v2: MTBVersion): number;
    static fromVVersionString(str: string): MTBVersion;
    static fromVersionString(str: string): MTBVersion;
    static fromToolsVersionString(str: string): MTBVersion | undefined;
}
//# sourceMappingURL=mtbversion.d.ts.map