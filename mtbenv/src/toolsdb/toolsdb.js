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
exports.ToolsDB = exports.MTBToolSource = void 0;
const mtbtool_1 = require("./mtbtool");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const mtbutils_1 = require("../misc/mtbutils");
var MTBToolSource;
(function (MTBToolSource) {
    MTBToolSource["TechPack"] = "tech-pack";
    MTBToolSource["Eap"] = "early-access-pack";
    MTBToolSource["ToolsDir"] = "tools-dir";
    MTBToolSource["IDC"] = "idc";
})(MTBToolSource || (exports.MTBToolSource = MTBToolSource = {}));
;
class ToolsDB {
    tools_dirs_ = [];
    active_tools_ = new Map();
    tools_ = [];
    constructor() {
    }
    get activeSet() {
        return Array.from(this.active_tools_.values());
    }
    addToolsDir(dir) {
        this.tools_dirs_.push(dir);
    }
    findToolByGUID(guid) {
        for (let tool of this.active_tools_.values()) {
            if (tool.id == guid) {
                return tool;
            }
        }
    }
    scanAll(logger) {
        let ret = new Promise((resolve, reject) => {
            for (let one of this.tools_dirs_) {
                let p = this.scanForTools(logger, one);
            }
            resolve();
        });
        return ret;
    }
    setActiveToolSet(eap) {
        this.active_tools_.clear();
        for (let tool of this.tools_) {
            let current = this.active_tools_.get(tool.id);
            if (current === undefined) {
                //
                // There is no current tool with this id, so we can add it
                //
                this.active_tools_.set(tool.id, tool);
            }
            else if (tool.source == MTBToolSource.Eap) {
                //
                // There is a tool from the EAP pack.  It always takes precedence
                //
                this.active_tools_.set(tool.id, tool);
            }
            else if (current.source !== MTBToolSource.Eap && tool.version.isGreaterThen(current.version)) {
                //
                // We found a tool with a newer version, and the existing tool is not from the EAP pack.  We
                // will use it
                this.active_tools_.set(tool.id, tool);
            }
        }
    }
    scanForTools(logger, dir) {
        for (let one of fs.readdirSync(dir.dir)) {
            let fullpath = path.join(dir.dir, one);
            if (fs.statSync(fullpath).isDirectory()) {
                this.scanForTool(logger, fullpath, dir.source);
            }
        }
    }
    scanForTool(logger, dir, source) {
        let jsonfile = path.join(dir, "props.json");
        if (!fs.existsSync(jsonfile)) {
            jsonfile = path.join(dir, "mtbprops.json");
            if (!fs.existsSync(jsonfile)) {
                return;
            }
        }
        logger.debug(`reading tools json file ${jsonfile}`);
        let props = mtbutils_1.MTBUtils.readJSONFile(logger, 'toolsdb', jsonfile);
        if (props.prop_files && Array.isArray(props.prop_files)) {
            for (let one of props.prop_files) {
                let fpath = path.join(dir, one);
                if (fs.existsSync(fpath) && fs.statSync(fpath).isFile()) {
                    props = mtbutils_1.MTBUtils.readJSONFile(logger, 'toolsdb', fpath);
                    if (props.core && props.core.id && props.core.name && props.core.version) {
                        let tool = new mtbtool_1.MTBTool(dir, props, source);
                        this.tools_.push(tool);
                    }
                }
            }
        }
        else if (props.core && props.core.id && props.core.name && props.core.version) {
            let tool = new mtbtool_1.MTBTool(dir, props, source);
            this.tools_.push(tool);
        }
    }
}
exports.ToolsDB = ToolsDB;
//# sourceMappingURL=toolsdb.js.map