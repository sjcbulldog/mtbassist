import { MTBAssetRequest } from './mtbassetreq';
import { MTBBspInstance } from './mtbbspinst';
import { MTBAppInfo } from './mtbappinfo';
import { MTBDirectoryList } from './mtbdirlist';
import winston from 'winston';
export declare class MTBProjectInfo {
    static readonly ExpandIngorePathPrefix = "$(SEARCH_";
    private rootdir_;
    private vars_;
    private components_?;
    private asset_search_path_;
    private user_search_path_;
    private ignore_path_;
    private appinfo_;
    private add_back_path2_;
    private asset_requests_;
    private bsp_instances_;
    private asset_instances_;
    private missing_assets_;
    private dir_list_?;
    private static required_vars_;
    private static default_vars_;
    constructor(app: MTBAppInfo, dir: string, vars: Map<string, string>);
    get missingAssets(): MTBAssetRequest[];
    get dirList(): MTBDirectoryList;
    searchPath(): string[];
    ignorePath(): string[];
    get target(): string;
    get toolchain(): string;
    libdir(): string;
    depsdir(): string;
    importdir(): string;
    shareddir(): string;
    globaldir(): string;
    userSuppliedSearchPath(): string[];
    userSuppliedIgnorePath(): string[];
    buildPath(): string;
    components(): string[];
    disabledComponents(): string[];
    hasCoreMake(): boolean;
    isValid(): Error | undefined;
    initialize(logger: winston.Logger): Promise<void>;
    private addMtbFileToSearch;
    private createAbsoluteList;
    private setupSearchPaths;
    /**
     * This method is used to filter the add back paths.  If there are any paths in the add back path list that
     * are not found under an ignore path, they are removed from the list.
     */
    private filterAddBackPaths;
    private expandPath;
    private readCyIgnoreFile;
    private findCyIgnoreFiles;
    private specialCaseTargetCommit;
    private addBspInstance;
    private findBSPsCandidateDirsFromAssets;
    private findBSPsfromBSPDir;
    private findBSPInstances;
    private findAssetInstances;
    get targetBSPInstance(): MTBBspInstance | undefined;
    private processCurrentBSP;
    private findMTBFiles;
    private readMTBFiles;
    private clearState;
}
//# sourceMappingURL=mtbprojinfo.d.ts.map