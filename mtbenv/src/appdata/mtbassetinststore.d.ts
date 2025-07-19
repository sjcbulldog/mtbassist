import { MTBAssetInstance } from "./mtbassetinst";
export declare class MTBAssetInstStore {
    private assetInstances_;
    addAssetInstance(inst: MTBAssetInstance): void;
    getAssetInstance(fpath: string): MTBAssetInstance | undefined;
    removeAssetInstance(id: string): void;
    clear(): void;
}
//# sourceMappingURL=mtbassetinststore.d.ts.map