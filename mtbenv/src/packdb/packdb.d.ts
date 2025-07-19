import { MTBPack } from "./mtbpack";
export declare class PackDB {
    private packs_;
    constructor();
    get isEarlyAccessPackActive(): boolean;
    get eap(): MTBPack | undefined;
    getTechPacks(): MTBPack[];
    addPack(obj: any): void;
    getManifestFiles(): string[];
    getToolsDirs(): string[];
    getActivePacks(): MTBPack[];
}
//# sourceMappingURL=packdb.d.ts.map