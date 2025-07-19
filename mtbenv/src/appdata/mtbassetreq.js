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
exports.MTBAssetRequest = exports.MTBAssetStorageFormat = exports.MTBAssetRequestLocation = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode_uri_1 = require("vscode-uri");
const mtbnames_1 = require("../misc/mtbnames");
const mtbutils_1 = require("../misc/mtbutils");
var MTBAssetRequestLocation;
(function (MTBAssetRequestLocation) {
    MTBAssetRequestLocation[MTBAssetRequestLocation["LOCAL"] = 0] = "LOCAL";
    MTBAssetRequestLocation[MTBAssetRequestLocation["SHARED"] = 1] = "SHARED";
    MTBAssetRequestLocation[MTBAssetRequestLocation["GLOBAL"] = 2] = "GLOBAL";
    MTBAssetRequestLocation[MTBAssetRequestLocation["ABSOLUTE"] = 3] = "ABSOLUTE";
    MTBAssetRequestLocation[MTBAssetRequestLocation["PROJECT"] = 4] = "PROJECT";
    MTBAssetRequestLocation[MTBAssetRequestLocation["UNKNOWN"] = 5] = "UNKNOWN";
})(MTBAssetRequestLocation || (exports.MTBAssetRequestLocation = MTBAssetRequestLocation = {}));
var MTBAssetStorageFormat;
(function (MTBAssetStorageFormat) {
    MTBAssetStorageFormat[MTBAssetStorageFormat["MTB"] = 0] = "MTB";
    MTBAssetStorageFormat[MTBAssetStorageFormat["MTBX"] = 1] = "MTBX";
    MTBAssetStorageFormat[MTBAssetStorageFormat["UNKNOWN"] = 2] = "UNKNOWN";
})(MTBAssetStorageFormat || (exports.MTBAssetStorageFormat = MTBAssetStorageFormat = {}));
class MTBAssetRequest {
    location_type_;
    storage_format_;
    reponame_;
    asset_name_;
    uri_;
    commit_;
    is_direct_;
    path_;
    source_;
    constructor(uri, commit, locfield, stype, direct) {
        this.storage_format_ = stype;
        this.location_type_ = MTBAssetRequest.getLocationTypeFromString(locfield);
        this.reponame_ = MTBAssetRequest.getRepoNameFromLocation(this.location_type_, locfield);
        this.asset_name_ = this.reponame_;
        this.uri_ = uri;
        this.commit_ = commit;
        this.is_direct_ = direct;
        this.path_ = this.getPathFromString(locfield);
    }
    locationType() {
        return this.location_type_;
    }
    get isLocal() {
        return this.location_type_ === MTBAssetRequestLocation.LOCAL;
    }
    get isShared() {
        return this.location_type_ === MTBAssetRequestLocation.SHARED;
    }
    get isGlobal() {
        return this.location_type_ === MTBAssetRequestLocation.GLOBAL;
    }
    get isAbsolute() {
        return this.location_type_ === MTBAssetRequestLocation.ABSOLUTE;
    }
    get isProject() {
        return this.location_type_ === MTBAssetRequestLocation.PROJECT;
    }
    isBSP() {
        return this.reponame_.startsWith(mtbnames_1.MTBNames.TARGET_PREFIX);
    }
    repoName() {
        return this.reponame_;
    }
    storageFormat() {
        return this.storage_format_;
    }
    name() {
        return this.asset_name_;
    }
    uri() {
        return this.uri_;
    }
    commit() {
        return this.commit_;
    }
    isDirect() {
        return this.is_direct_;
    }
    path() {
        return this.path_;
    }
    setPath(path) {
        this.path_ = path;
    }
    setSource(source) {
        this.source_ = source;
    }
    source() {
        return this.source_;
    }
    /**
     * Resolve the path of the asset request to a full path based on the directory list.  This is
     * a path to the
     * @param dirlist the set of special directories that are used to resolve the path
     * @returns
     */
    fullPath(dirlist) {
        let ret = '';
        switch (this.location_type_) {
            case MTBAssetRequestLocation.ABSOLUTE:
                ret = this.path_;
                break;
            case MTBAssetRequestLocation.GLOBAL:
                ret = path.join(dirlist.globaldir, this.path_);
                break;
            case MTBAssetRequestLocation.LOCAL:
                ret = path.join(dirlist.localdir, this.path_);
                break;
            case MTBAssetRequestLocation.SHARED:
                ret = path.join(dirlist.shareddir, this.path_);
                break;
            case MTBAssetRequestLocation.PROJECT:
                ret = path.join(dirlist.projdir, this.path_);
                break;
            default:
                ret = '';
        }
        return ret;
    }
    cloneTarget(dirlist) {
        let apath = this.fullPath(dirlist);
        return path.basename(apath);
    }
    /**
     * Resolve the path of the asset request to the path where the clone command should be
     * run to clone the asset.  This is a path to the directory where the asset should be cloned.
     * @param dirlist the set of special directories that are used to resolve the path
     * @returns path to where the asset should be cloned
     */
    cloneDir(dirlist) {
        let ret = '';
        switch (this.location_type_) {
            case MTBAssetRequestLocation.ABSOLUTE:
                ret = this.path_;
                break;
            case MTBAssetRequestLocation.GLOBAL:
                ret = path.join(dirlist.globaldir, this.path_);
                break;
            case MTBAssetRequestLocation.LOCAL:
                ret = path.join(dirlist.localdir, this.path_);
                break;
            case MTBAssetRequestLocation.SHARED:
                ret = path.join(dirlist.shareddir, this.path_);
                break;
            case MTBAssetRequestLocation.PROJECT:
                ret = path.join(dirlist.projdir, this.path_);
                break;
            default:
                ret = '';
        }
        return path.dirname(ret);
    }
    static createFromFile(file, stype, isDirect) {
        let ret;
        if (!fs.existsSync(file)) {
            throw new Error(`the file ${file} does not exist`);
        }
        else {
            let data = fs.readFileSync(file, 'utf-8');
            let lines = data.split('\n');
            if (lines.length === 2 && lines[1].trim().length == 0) {
                lines = [lines[0]];
            }
            if (lines.length !== 1) {
                throw new Error(`the file ${file} does not contain a valid MTB asset request - it must contain a single line`);
            }
            let parts = lines[0].split('#');
            if (parts.length !== 3) {
                throw new Error(`the file ${file} does not contain a valid MTB asset request - it must contain 3 parts separated by colons`);
            }
            if (!mtbutils_1.MTBUtils.isValidUri(parts[0])) {
                throw new Error(`the file ${file} does not contain a valid MTB asset request - the URI is invalid`);
            }
            let loctype = this.getLocationTypeFromString(parts[2]);
            let reponame = this.getRepoNameFromLocation(loctype, parts[2]);
            if (reponame.length === 0) {
                throw new Error(`the file ${file} does not contain a valid MTB asset request - the location is invalid`);
            }
            let uri = vscode_uri_1.URI.parse(parts[0].trim());
            ret = new MTBAssetRequest(uri, parts[1], parts[2], stype, isDirect);
        }
        return ret;
    }
    static getLocationTypeFromString(locationString) {
        let locationType = MTBAssetRequestLocation.PROJECT;
        if (locationString.startsWith(mtbnames_1.MTBNames.SENTINEL_ABSOLUTE)) {
            locationType = MTBAssetRequestLocation.ABSOLUTE;
        }
        if (locationString.startsWith(mtbnames_1.MTBNames.SENTINEL_GLOBAL)) {
            locationType = MTBAssetRequestLocation.GLOBAL;
        }
        if (locationString.startsWith(mtbnames_1.MTBNames.SENTINEL_LOCAL)) {
            locationType = MTBAssetRequestLocation.LOCAL;
        }
        if (locationString.startsWith(mtbnames_1.MTBNames.SENTINEL_SHARED)) {
            locationType = MTBAssetRequestLocation.SHARED;
        }
        return locationType;
    }
    getPathFromString(locationString) {
        let regex = /(\$\$[A-Z_]+\$\$)(.*)/;
        let ret = locationString;
        let m = regex.exec(locationString);
        if (m && m[1] && m[2]) {
            if (m[1] === mtbnames_1.MTBNames.SENTINEL_LOCAL && m[2].length === 0) {
                ret = this.reponame_;
            }
            else {
                ret = m[2];
                if (this.isLocal || this.isShared || this.isGlobal) {
                    if (ret.startsWith('/')) {
                        ret = ret.substring(1);
                    }
                }
            }
        }
        return ret;
    }
    static getRepoNameFromLocation(location, locationString) {
        let repoName = '';
        let splitSlot = -1; // counted from the end. 0 is the last one
        // Separate the token from the data and remove any empty strings
        let bigParts = locationString.split('$$').filter(function (el) { return el.length !== 0; });
        let smallParts = [];
        if (bigParts.length === 1 || bigParts.length === 2) {
            smallParts = bigParts[bigParts.length - 1].split('/');
            smallParts = smallParts.filter(function (el) { return el.length !== 0; });
        }
        switch (location) {
            case MTBAssetRequestLocation.LOCAL:
            case MTBAssetRequestLocation.ABSOLUTE:
            case MTBAssetRequestLocation.PROJECT:
                splitSlot = 0;
                break;
            case MTBAssetRequestLocation.SHARED:
            case MTBAssetRequestLocation.GLOBAL:
                splitSlot = 1;
                break;
        }
        if (splitSlot >= 0 && smallParts.length >= 1 + splitSlot) {
            repoName = smallParts[smallParts.length - 1 - splitSlot];
        }
        return repoName;
    }
}
exports.MTBAssetRequest = MTBAssetRequest;
//# sourceMappingURL=mtbassetreq.js.map