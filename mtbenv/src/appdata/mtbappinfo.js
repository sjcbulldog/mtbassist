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
exports.MTBAppInfo = exports.ApplicationType = void 0;
const path = __importStar(require("path"));
const mtbnames_1 = require("../misc/mtbnames");
const mtbapploader_1 = require("./mtbapploader");
var ApplicationType;
(function (ApplicationType) {
    ApplicationType[ApplicationType["Unknown"] = 0] = "Unknown";
    ApplicationType[ApplicationType["Combined"] = 1] = "Combined";
    ApplicationType[ApplicationType["Application"] = 2] = "Application";
})(ApplicationType || (exports.ApplicationType = ApplicationType = {}));
class MTBAppInfo {
    static app_required_vars_ = [
        mtbnames_1.MTBNames.MTB_TYPE,
        mtbnames_1.MTBNames.MTB_PROJECTS,
        mtbnames_1.MTBNames.MTB_QUERY,
        mtbnames_1.MTBNames.MTB_TOOLS_DIR,
        mtbnames_1.MTBNames.MTB_BUILD_SUPPORT,
    ];
    type_;
    appdir_;
    env_;
    projects_ = [];
    vars_;
    constructor(env, appdir) {
        this.type_ = ApplicationType.Unknown;
        this.appdir_ = appdir;
        this.env_ = env;
    }
    setVars(vars) {
        this.vars_ = vars;
    }
    setType(type) {
        this.type_ = type;
    }
    type() {
        return this.type_;
    }
    load(logger) {
        let loader = new mtbapploader_1.MTBAppLoader(logger, this, this.env_.toolsDir());
        return loader.load();
    }
    get appdir() {
        return this.appdir_;
    }
    get bspdir() {
        return path.join(this.appdir_, mtbnames_1.MTBNames.BSPsDir);
    }
    addProject(proj) {
        this.projects_.push(proj);
    }
    get projects() {
        return this.projects_;
    }
    get loadedProjectCount() {
        return this.projects_.length;
    }
    get totalProjectCount() {
        if (!this.vars_) {
            throw new Error('MTBAppInfo.totalProjectCount called without setting the get_app_info vars');
        }
        return this.vars_.get(mtbnames_1.MTBNames.MTB_PROJECTS)?.split(',').length || 0;
    }
    isValid() {
        let msg = '';
        let ret = undefined;
        if (!this.vars_) {
            return new Error('MTBAppInfo.isValid called without setting the get_app_info vars');
        }
        if (!this.vars_.has(mtbnames_1.MTBNames.MTB_TYPE)) {
            msg = `the project does not have an '${mtbnames_1.MTBNames.MTB_TYPE}' value`;
            return new Error(msg);
        }
        const type = this.vars_.get(mtbnames_1.MTBNames.MTB_TYPE);
        if (type !== 'APPLICATION' && type !== 'COMBINED') {
            msg = `the project has an invalid '${mtbnames_1.MTBNames.MTB_TYPE}' value`;
            return new Error(msg);
        }
        if (type === 'APPLICATION') {
            for (let v of MTBAppInfo.app_required_vars_) {
                if (!this.vars_.has(v)) {
                    if (msg.length > 0) {
                        msg += '\n';
                    }
                    msg += `the project does not have an '${v}' value`;
                }
            }
        }
        if (msg.length) {
            ret = new Error(msg);
        }
        return ret;
    }
}
exports.MTBAppInfo = MTBAppInfo;
//# sourceMappingURL=mtbappinfo.js.map