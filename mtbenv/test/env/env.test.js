"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const vitest_1 = require("vitest");
const src_1 = require("../../src");
const winston_1 = __importDefault(require("winston"));
(0, vitest_1.test)('Load Manifests', async () => {
    let logger = winston_1.default.createLogger({
        transports: [new winston_1.default.transports.Console()]
    });
    let mtbenv = src_1.ModusToolboxEnvironment.getInstance(logger, __dirname);
    (0, vitest_1.expect)(mtbenv).not.toBeNull();
    await mtbenv.load(src_1.MTBLoadFlags.Manifest);
    mtbenv.destroy();
});
(0, vitest_1.test)('Load Single Core (p6)', async () => {
    let logger = winston_1.default.createLogger({
        transports: [new winston_1.default.transports.Console()]
    });
    let proj = path_1.default.join(__dirname, '..', '..', 'tc', 'p6hello');
    let mtbenv = src_1.ModusToolboxEnvironment.getInstance(logger, proj);
    (0, vitest_1.expect)(mtbenv).not.toBeNull();
    await mtbenv.load(src_1.MTBLoadFlags.All, proj);
    mtbenv.destroy();
});
(0, vitest_1.test)('Load Multi Core (edge)', async () => {
    let logger = winston_1.default.createLogger({
        transports: [new winston_1.default.transports.Console()]
    });
    let proj = path_1.default.join(__dirname, '..', '..', 'tc', 'edgehello');
    let mtbenv = src_1.ModusToolboxEnvironment.getInstance(logger, proj);
    (0, vitest_1.expect)(mtbenv).not.toBeNull();
    await mtbenv.load(src_1.MTBLoadFlags.All, proj);
    mtbenv.destroy();
});
//# sourceMappingURL=env.test.js.map