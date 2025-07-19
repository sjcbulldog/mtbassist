"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mtbutils_1 = require("../../src/misc/mtbutils");
(0, vitest_1.test)('URI Validation', async () => {
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isValidUri('https://www.infineon.com')).toBe(true);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isValidUri('invalid-uri')).toBe(false);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isValidUri('http://localhost:3000')).toBe(true);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isValidUri('ftp://example.com')).toBe(true);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isValidUri('file:///C:/path/to/file.txt')).toBe(true);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isValidUri('mailto:example@example.com')).toBe(true);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isValidUri('https://example.com/path?query=123#fragment')).toBe(true);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isValidUri('https://')).toBe(false);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isValidUri('')).toBe(false);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isValidUri('http://')).toBe(false);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isValidUri('')).toBe(false);
});
(0, vitest_1.test)('Root Path Validation', async () => {
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isRootPath('/')).toBe(true);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isRootPath('C:\\')).toBe(true);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isRootPath('C:\\Program Files')).toBe(false);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isRootPath('/home/user')).toBe(false);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isRootPath('C:/Users/Username/Documents')).toBe(false);
    (0, vitest_1.expect)(mtbutils_1.MTBUtils.isRootPath('C:\\Windows\\System32')).toBe(false);
});
//# sourceMappingURL=utils.test.js.map