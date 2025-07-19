import { MTBAssetInstance } from "./mtbassetinst";

export class MTBAssetInstStore {
    private assetInstances_: Map<string, MTBAssetInstance> = new Map() ;

    public addAssetInstance(inst: MTBAssetInstance) {
        if (!inst.rootdir) {
            throw new Error('Asset instance must have a root directory') ;
        }

        this.assetInstances_.set(inst.rootdir, inst) ;
    }

    public getAssetInstance(fpath: string) : MTBAssetInstance | undefined {
        return this.assetInstances_.get(fpath) ;
    }

    public removeAssetInstance(id: string) {
        this.assetInstances_.delete(id) ;
    }

    public clear() : void {
        this.assetInstances_.clear() ;
    }
}