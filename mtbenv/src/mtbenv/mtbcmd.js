"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTBCommand = void 0;
class MTBCommand {
    exe_;
    args_;
    constructor(exe, args) {
        this.exe_ = exe;
        this.args_ = args;
    }
    get exe() {
        return this.exe_;
    }
    get args() {
        return this.args_;
    }
}
exports.MTBCommand = MTBCommand;
//# sourceMappingURL=mtbcmd.js.map