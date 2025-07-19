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
exports.PackDBLoader = void 0;
const mtbutils_1 = require("../misc/mtbutils");
const toolsdb_1 = require("../toolsdb/toolsdb");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class PackDBLoader {
    packdb_;
    toolsdb_;
    logger_;
    constructor(logger, db, tdb) {
        this.packdb_ = db;
        this.toolsdb_ = tdb;
        this.logger_ = logger;
    }
    scanDirectory(dir) {
        let ret = new Promise((resolve, reject) => {
            if (!fs.existsSync(dir)) {
                this.logger_.info(`packdbloader: directory '${dir}' does not exist - skipping`);
                resolve();
                return;
            }
            this.logger_.debug(`packdbloader: scanning directory '${dir}'`);
            for (let file of fs.readdirSync(dir)) {
                let fullpath = path.join(dir, file);
                if (path.extname(file) == '.json') {
                    this.checkOneJSONFile(fullpath);
                }
            }
            resolve();
        });
        return ret;
    }
    checkOneJSONFile(file) {
        this.logger_.debug(`packdbloader: checking file '${file}'`);
        let obj;
        try {
            obj = mtbutils_1.MTBUtils.readJSONFile(this.logger_, 'packdbloader', file);
        }
        catch (err) {
            return;
        }
        if (!obj.type || obj.type !== 'content-pack') {
            // not a content pack but might be a tool of interest
            this.logger_.debug(`packdbloader: file '${file}' is not a content pack - checking if it is a tool`);
            this.checkTool(obj);
        }
        else {
            // content pack
            this.logger_.debug(`packdbloader: file '${file}' is a content pack - loading it`);
            this.checkPack(obj);
        }
    }
    checkTool(obj) {
        let exepaths = [];
        if (obj.path) {
            exepaths.push(obj.path);
        }
        if (obj.exePath) {
            exepaths.push(obj.exePath);
        }
        if (obj.attributes && obj.attributes && obj.attributes['tools-root']) {
            this.toolsdb_.addToolsDir({ dir: obj.attributes['tools-root'], source: toolsdb_1.MTBToolSource.IDC });
        }
        else {
            let extdir = undefined;
            for (let one of exepaths) {
                extdir = this.searchParents(one, 'mtbprops.json');
                if (extdir) {
                    break;
                }
            }
            if (!extdir) {
                for (let one of exepaths) {
                    extdir = this.searchParents(one, 'props.json');
                    if (extdir) {
                        break;
                    }
                }
            }
            if (extdir) {
                this.toolsdb_.addToolsDir({ dir: path.dirname(extdir), source: toolsdb_1.MTBToolSource.IDC });
            }
        }
    }
    searchParents(dir, file) {
        while (!mtbutils_1.MTBUtils.isRootPath(dir)) {
            let fpath = path.join(dir, file);
            if (fs.existsSync(fpath)) {
                return fpath;
            }
            dir = path.dirname(dir);
        }
        return undefined;
    }
    checkPack(obj) {
        this.packdb_.addPack(obj);
    }
}
exports.PackDBLoader = PackDBLoader;
//# sourceMappingURL=packdbloader.js.map