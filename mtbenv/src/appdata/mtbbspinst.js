"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTBBspInstance = void 0;
const mtbassetinst_1 = require("./mtbassetinst");
class MTBBspInstance extends mtbassetinst_1.MTBAssetInstance {
    constructor(rootpath) {
        super(rootpath);
    }
    static createFromPath(bsppath) {
        let ret = new MTBBspInstance(bsppath);
        return ret;
    }
}
exports.MTBBspInstance = MTBBspInstance;
//# sourceMappingURL=mtbbspinst.js.map