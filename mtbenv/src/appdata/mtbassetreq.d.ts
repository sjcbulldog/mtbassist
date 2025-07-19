import { URI } from 'vscode-uri';
import { MTBDirectoryList } from './mtbdirlist';
export declare enum MTBAssetRequestLocation {
    LOCAL = 0,
    SHARED = 1,
    GLOBAL = 2,
    ABSOLUTE = 3,
    PROJECT = 4,
    UNKNOWN = 5
}
export declare enum MTBAssetStorageFormat {
    MTB = 0,
    MTBX = 1,
    UNKNOWN = 2
}
export declare class MTBAssetRequest {
    private location_type_;
    private storage_format_;
    private reponame_;
    private asset_name_;
    private uri_;
    private commit_;
    private is_direct_;
    private path_;
    private source_?;
    constructor(uri: URI, commit: string, locfield: string, stype: MTBAssetStorageFormat, direct: boolean);
    locationType(): MTBAssetRequestLocation;
    get isLocal(): boolean;
    get isShared(): boolean;
    get isGlobal(): boolean;
    get isAbsolute(): boolean;
    get isProject(): boolean;
    isBSP(): boolean;
    repoName(): string;
    storageFormat(): MTBAssetStorageFormat;
    name(): string;
    uri(): URI;
    commit(): string;
    isDirect(): boolean;
    path(): string;
    setPath(path: string): void;
    setSource(source: string): void;
    source(): string | undefined;
    /**
     * Resolve the path of the asset request to a full path based on the directory list.  This is
     * a path to the
     * @param dirlist the set of special directories that are used to resolve the path
     * @returns
     */
    fullPath(dirlist: MTBDirectoryList): string;
    cloneTarget(dirlist: MTBDirectoryList): string;
    /**
     * Resolve the path of the asset request to the path where the clone command should be
     * run to clone the asset.  This is a path to the directory where the asset should be cloned.
     * @param dirlist the set of special directories that are used to resolve the path
     * @returns path to where the asset should be cloned
     */
    cloneDir(dirlist: MTBDirectoryList): string;
    static createFromFile(file: string, stype: MTBAssetStorageFormat, isDirect: boolean): MTBAssetRequest;
    private static getLocationTypeFromString;
    private getPathFromString;
    private static getRepoNameFromLocation;
}
//# sourceMappingURL=mtbassetreq.d.ts.map