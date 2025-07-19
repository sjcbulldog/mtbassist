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
exports.MTBUtils = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const exec = __importStar(require("child_process"));
class MTBUtils {
    static name1 = 'Infineon_Technologies_AG';
    static name2 = 'Infineon-Toolbox';
    static toolsRegex1 = /tools_([0-9]+)\.([0-9]+)/;
    static toolsRegex2 = /tools_([0-9]+)\.([0-9]+)\.([0-9]+)/;
    static removeValuesFromArray(sourceArray, valuesToRemove) {
        return sourceArray.filter(item => !valuesToRemove.includes(item));
    }
    static isValidUri(uri) {
        let ret = true;
        try {
            let uriobj = new URL(uri);
        }
        catch (_) {
            ret = false;
        }
        return ret;
    }
    static isRootPath(pathToCheck) {
        if (path.isAbsolute(pathToCheck)) {
            const root = path.parse(pathToCheck).root;
            return root === pathToCheck;
        }
        return false;
    }
    static userInfineonDeveloperCenterRegistryDir() {
        let ret;
        if (process.platform === "win32") {
            if (process.env.LOCALAPPDATA) {
                ret = path.join(process.env.LOCALAPPDATA, this.name1, this.name2);
            }
        }
        else if (process.platform === 'darwin') {
            if (process.env.HOME) {
                ret = path.join(process.env.HOME, 'Library', 'Application Support', this.name1, this.name2);
            }
        }
        else if (process.platform === 'linux') {
            if (process.env.HOME) {
                ret = path.join(process.env.HOME, '.local', 'share', this.name1, this.name2);
            }
        }
        else {
            throw new Error('Unsupported platform');
        }
        return ret;
    }
    static allInfineonDeveloperCenterRegistryDir() {
        let ret;
        if (process.platform === "win32") {
            if (process.env.ALLUSERSPROFILE) {
                ret = path.join(process.env.ALLUSERSPROFILE, this.name1, this.name2);
            }
        }
        else if (process.platform === 'darwin') {
            if (process.env.HOME) {
                ret = path.join('/Library', 'Application Support', this.name1, this.name2);
            }
        }
        else if (process.platform === 'linux') {
            if (process.env.HOME) {
                ret = path.join('/usr/local/share', this.name1, this.name2);
            }
        }
        else {
            throw new Error('Unsupported platform');
        }
        return ret;
    }
    static getCommonInstallLocation() {
        let ret;
        if (process.platform === "win32") {
            ret = path.join(os.homedir(), 'ModusToolbox');
        }
        else if (process.platform === 'darwin') {
            ret = path.join(os.homedir(), 'ModusToolbox');
        }
        else if (process.platform === 'linux') {
            ret = '/Applications/ModusToolbox';
        }
        else {
            throw new Error('Unsupported platform');
        }
        return ret;
    }
    static readJSONFile(logger, mod, file) {
        let data;
        try {
            data = fs.readFileSync(file);
            if (data.length >= 3 && data[0] == 0xef && data[1] == 0xbb && data[2] == 0xbf) {
                data = data.subarray(3);
            }
        }
        catch (err) {
            let msg = `${mod}: error reading file '${file}' - ${err}`;
            logger.error(msg);
            throw new Error(msg);
        }
        let obj;
        try {
            obj = JSON.parse(data.toString('utf-8'));
        }
        catch (err) {
            let msg = `${mod}: error parsing file '${file}' as JSON - ${err}`;
            logger.error(msg);
            throw new Error(msg);
        }
        return obj;
    }
    static runProg(cmd, cwd, args) {
        let ret = new Promise((resolve, reject) => {
            let text = "";
            let cp = exec.spawn(cmd, args, {
                cwd: cwd,
                windowsHide: true,
                shell: false
            });
            cp.stdout?.on('data', (data) => {
                text += data.toString();
            });
            cp.stderr?.on('data', (data) => {
                text += data.toString();
            });
            cp.on('error', (err) => {
                reject(err);
            });
            cp.on('close', (code) => {
                if (!code) {
                    code = 0;
                }
                let ret = text.split('\n');
                resolve([code, ret]);
            });
        });
        return ret;
    }
    static callMake(shtools, cwd, makeargs) {
        let makepath = path.join(shtools, 'bin', 'make');
        let bashpath = path.join(shtools, 'bin', 'bash');
        if (process.platform === 'win32') {
            makepath += '.exe';
            bashpath += '.exe';
            makepath = makepath.replace(/\\/g, '/');
            bashpath = bashpath.replace(/\\/g, '/');
        }
        let pgm = 'PATH=/bin:/usr/bin ; ' + makepath + ' ' + makeargs.join(' ');
        let args = ['--norc', '--noprofile', '-c', pgm];
        return this.runProg(bashpath, cwd, args);
    }
    static callGetAppInfo(shtools, cwd) {
        let ret = new Promise((resolve, reject) => {
            this.callMake(shtools, cwd, ['get_app_info', 'CY_PROTOCOL=2', 'MTB_QUERY=1'])
                .then((result) => {
                if (result[0] !== 0) {
                    reject(new Error(`the call to 'make get_app_info' returns status code ${result[0]}`));
                }
                else {
                    let vars = new Map();
                    for (let one of result[1]) {
                        let equal = one.indexOf('=');
                        if (equal !== -1) {
                            let name = one.substring(0, equal);
                            let value = one.substring(equal + 1);
                            vars.set(name, value);
                        }
                    }
                    resolve(vars);
                }
            })
                .catch((err) => {
                reject(err);
            });
        });
        return ret;
    }
}
exports.MTBUtils = MTBUtils;
//# sourceMappingURL=mtbutils.js.map