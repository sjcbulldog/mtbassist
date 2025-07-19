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
exports.MTBInstance = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const mtbversion_1 = require("../misc/mtbversion");
class MTBInstance {
    static versionXMLRegEx = /^<version>([\d.]+)<\/version>$/;
    static versionTXTRegEx = /^([\d.]+)$/;
    rootdir_;
    version_;
    props_ = new Map();
    name_;
    id_;
    props_obj_;
    constructor(rootdir) {
        this.rootdir_ = rootdir;
        if (!fs.existsSync(this.rootdir_)) {
            throw new Error(`Root directory does not exist: ${this.rootdir_}`);
        }
        this.init();
        this.computeAssetName();
    }
    get name() {
        return this.name_;
    }
    get rootdir() {
        return this.rootdir_;
    }
    get version() {
        return this.version_;
    }
    get id() {
        return this.id_;
    }
    set version(v) {
        this.version_ = v;
    }
    get props() {
        return this.props_;
    }
    computeAssetName() {
        if (this.rootdir_) {
            this.name_ = path.basename(this.rootdir_);
            if (/[a-zA-Z_]+-v\d+\.\d+\.\d+/.test(this.name_)) {
                let tmp = path.dirname(this.rootdir_);
                this.name_ = path.basename(tmp);
            }
        }
    }
    init() {
        let verxml = path.join(this.rootdir_, 'version.xml');
        let vertxt = path.join(this.rootdir_, 'version.txt');
        let propsjson = path.join(this.rootdir_, 'props.json');
        if (fs.existsSync(verxml)) {
            let ver = fs.readFileSync(verxml, 'utf8').trim();
            let match = ver.match(MTBInstance.versionXMLRegEx);
            if (match && match[1]) {
                this.version_ = mtbversion_1.MTBVersion.fromVersionString(match[1]);
            }
            else {
                throw new Error(`Invalid version format in ${verxml}`);
            }
        }
        else if (fs.existsSync(vertxt)) {
            let ver = fs.readFileSync(vertxt, 'utf8').trim();
            let match = ver.match(MTBInstance.versionTXTRegEx);
            if (match && match[1]) {
                this.version_ = mtbversion_1.MTBVersion.fromVersionString(match[1]);
            }
            else {
                throw new Error(`Invalid version format in ${vertxt}`);
            }
        }
        if (fs.existsSync(propsjson)) {
            this.readPropsFile(propsjson);
        }
        if (!this.version_) {
            throw new Error(`No version information found in ${this.rootdir_}`);
        }
    }
    readPropsFile(name) {
        this.props_obj_ = JSON.parse(fs.readFileSync(name, 'utf8'));
        for (let key in this.props_obj_) {
            this.props_.set(key, this.props_obj_[key]);
        }
        if (this.props_obj_.hasOwnProperty('core') && typeof this.props_obj_.core === 'object') {
            if (!this.version_ && this.props_obj_.core.hasOwnProperty('version') && typeof this.props_obj_.core.version === 'string') {
                this.version_ = mtbversion_1.MTBVersion.fromVersionString(this.props_obj_.core.version);
            }
            if (this.props_obj_.core.hasOwnProperty('name') && typeof this.props_obj_.core.name === 'string') {
                // TODO: make sure this.props_obj_.json core.name field matches the instance name from the path
            }
            if (this.props_obj_.core.hasOwnProperty('id') && typeof this.props_obj_.core.id === 'string') {
                this.props_.set('id', this.props_obj_.core.id);
            }
        }
    }
}
exports.MTBInstance = MTBInstance;
//# sourceMappingURL=mtbinstance.js.map