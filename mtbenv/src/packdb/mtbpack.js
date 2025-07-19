"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTBPack = void 0;
class MTBPack {
    id_;
    desc_;
    constructor(id, obj) {
        this.id_ = id;
        this.desc_ = obj;
    }
    packType() {
        return this.desc_.attributes['pack-type'];
    }
    path() {
        return this.desc_.path;
    }
    featureId() {
        return this.id_;
    }
}
exports.MTBPack = MTBPack;
//# sourceMappingURL=mtbpack.js.map