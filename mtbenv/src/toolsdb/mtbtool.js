"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTBTool = void 0;
const mtbversion_1 = require("../misc/mtbversion");
;
class MTBTool {
    path_;
    props_;
    src_;
    version_;
    constructor(path, props, src) {
        this.path_ = path;
        this.props_ = props;
        this.src_ = src;
        let v = mtbversion_1.MTBVersion.fromVersionString(props.core.version);
        if (v === undefined) {
            throw new Error(`Invalid version string '${props.core.version}' for tool ${props.core.id}`);
        }
        this.version_ = v;
    }
    get programs() {
        return this.props_.opt.programs;
    }
    get hasCodeGenerator() {
        return this.props_.opt.programs.some((pgm) => {
            return pgm['code-gen'] !== undefined && pgm['code-gen'].length > 0;
        });
    }
    get source() {
        return this.src_;
    }
    get path() {
        return this.path_;
    }
    get id() {
        return this.props_.core.id;
    }
    get version() {
        return this.version_;
    }
}
exports.MTBTool = MTBTool;
//# sourceMappingURL=mtbtool.js.map