import winston from "winston";
import { MTBApp } from "./mtbapp";
import { MTBBoard } from "./mtbboard";
import { MTBItem } from "./mtbitem";
import { MTBMiddleware } from "./mtbmiddleware";
export declare class MTBManifestDB {
    isLoaded: boolean;
    isLoading: boolean;
    hadError: boolean;
    private apps;
    private boards;
    private middleware;
    private loadedCallbacks;
    private manifestLoader?;
    constructor();
    loadManifestData(logger: winston.Logger, paths: string[]): Promise<void>;
    addLoadedCallback(cb: () => void): void;
    addApp(logger: winston.Logger, app: MTBApp): void;
    addBoard(logger: winston.Logger, board: MTBBoard): void;
    addMiddleware(logger: winston.Logger, middleware: MTBMiddleware): void;
    addDependency(id: string, commit: string, did: string, dcommit: string): void;
    findApp(id: string): MTBApp | undefined;
    findBoard(id: string): MTBBoard | undefined;
    findMiddleware(id: string): MTBMiddleware | undefined;
    findItemByID(id: string): MTBItem | undefined;
}
//# sourceMappingURL=mtbmanifestdb.d.ts.map