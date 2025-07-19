import { MTBManifestDB as MTBManifestDB } from './mtbmanifestdb';
import winston from 'winston';
export declare class MtbManifestLoader {
    private logger_;
    private isLoading;
    private superManifestList;
    private superManifestData;
    private manifestContentList;
    private manifestContentData;
    private manifestDepList;
    private manifestDepData;
    private db;
    constructor(logger: winston.Logger, db: MTBManifestDB);
    loadManifestData(paths: string[]): Promise<void>;
    private loadAllSuperManifests;
    private loadAllContentManifests;
    private loadAllDependencyManifests;
    private processAllSuperManifests;
    private processAllContentManifests;
    private processAllDependencyManifests;
    private getManifestData;
    private loadManifestFile;
    private fixManifestList;
    private processAppManifestList;
    private processBoardManifestList;
    private processMiddlewareManifestList;
    private processApp;
    private processBoard;
    private processMiddleware;
    private processDependerVersions;
    private processDependencyManifestXml;
    private processContentManifestXML;
    private processSuperManifestXML;
    private parseContentManifest;
    private parseDependencyManifest;
    private parseSuperManifest;
}
//# sourceMappingURL=mtbmanifestloader.d.ts.map