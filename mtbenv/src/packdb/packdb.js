"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackDB = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const mtbpack_1 = require("./mtbpack");
const vscode_uri_1 = require("vscode-uri");
const mtbnames_1 = require("../misc/mtbnames");
class PackDB {
    packs_ = new Map();
    constructor() {
    }
    get isEarlyAccessPackActive() {
        if (process.env.MTB_ENABLE_EARLY_ACCESS) {
            let pack = this.packs_.get(process.env.MTB_ENABLE_EARLY_ACCESS);
            if (pack && pack.packType() === 'early-access-pack') {
                return true;
            }
        }
        return false;
    }
    get eap() {
        if (process.env.MTB_ENABLE_EARLY_ACCESS) {
            let pack = this.packs_.get(process.env.MTB_ENABLE_EARLY_ACCESS);
            if (pack && pack.packType() === mtbnames_1.MTBNames.EarlyAccessPack) {
                return pack;
            }
        }
        return undefined;
    }
    getTechPacks() {
        let packs = [];
        this.packs_.forEach((pack) => {
            if (pack.packType() === 'tech-pack') {
                packs.push(pack);
            }
        });
        return packs;
    }
    addPack(obj) {
        if (obj.featureId && obj.attributes['pack-type'] && obj.path && obj.type === 'content-pack') {
            let pack = new mtbpack_1.MTBPack(obj.featureId, obj);
            this.packs_.set(obj.featureId, pack);
        }
    }
    getManifestFiles() {
        let ret = [];
        for (let pack of this.getActivePacks()) {
            let file = path.join(pack.path(), 'manifest.xml');
            if (fs.existsSync(file) && fs.statSync(file).isFile()) {
                ret.push(vscode_uri_1.URI.file(file).toString());
            }
        }
        return ret;
    }
    getToolsDirs() {
        let ret = [];
        for (let pack of this.getActivePacks()) {
            let dir = path.join(pack.path(), 'tools');
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                ret.push(dir);
            }
        }
        return ret;
    }
    getActivePacks() {
        let packs = [];
        this.packs_.forEach((pack) => {
            if (pack.packType() !== 'early-access-pack') {
                packs.push(pack);
            }
            else if (process.env.MTB_ENABLE_EARLY_ACCESS && process.env.MTB_ENABLE_EARLY_ACCESS === pack.featureId()) {
                packs.push(pack);
            }
        });
        return packs;
    }
}
exports.PackDB = PackDB;
//# sourceMappingURL=packdb.js.map