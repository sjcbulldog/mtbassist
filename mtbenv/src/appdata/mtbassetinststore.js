"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTBAssetInstStore = void 0;
class MTBAssetInstStore {
    assetInstances_ = new Map();
    addAssetInstance(inst) {
        if (!inst.rootdir) {
            throw new Error('Asset instance must have a root directory');
        }
        this.assetInstances_.set(inst.rootdir, inst);
    }
    getAssetInstance(fpath) {
        return this.assetInstances_.get(fpath);
    }
    removeAssetInstance(id) {
        this.assetInstances_.delete(id);
    }
    clear() {
        this.assetInstances_.clear();
    }
}
exports.MTBAssetInstStore = MTBAssetInstStore;
//# sourceMappingURL=mtbassetinststore.js.map