import { URI } from "vscode-uri";
import { MTBItemVersion } from "./mtbitemversion";
import winston from "winston";
export declare class MTBItem {
    readonly name: string;
    readonly source: URI;
    readonly id: string;
    readonly versions: MTBItemVersion[];
    constructor(src: URI, id: string, name: string, versions: MTBItemVersion[]);
    containsVersion(num: string): boolean;
    findVersion(commit: string): MTBItemVersion | undefined;
    newerVersions(version: string): string[];
    protected static compareStringArrays(a1: string[], a2: string[]): boolean;
    protected static mergeMsg(logger: winston.Logger, id: string, typestr: string, field: string, f1: string, f2: string, src1: URI, src2: URI): void;
}
//# sourceMappingURL=mtbitem.d.ts.map