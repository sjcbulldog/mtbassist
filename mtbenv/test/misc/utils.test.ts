import { expect, test } from 'vitest' ;
import { MTBUtils } from '../../src/misc/mtbutils';

test('URI Validation', async () => {
    expect(MTBUtils.isValidUri('https://www.infineon.com')).toBe(true);
    expect(MTBUtils.isValidUri('invalid-uri')).toBe(false);
    expect(MTBUtils.isValidUri('http://localhost:3000')).toBe(true);
    expect(MTBUtils.isValidUri('ftp://example.com')).toBe(true);
    expect(MTBUtils.isValidUri('file:///C:/path/to/file.txt')).toBe(true);
    expect(MTBUtils.isValidUri('mailto:example@example.com')).toBe(true);
    expect(MTBUtils.isValidUri('https://example.com/path?query=123#fragment')).toBe(true);
    expect(MTBUtils.isValidUri('https://')).toBe(false);
    expect(MTBUtils.isValidUri('')).toBe(false);
    expect(MTBUtils.isValidUri('http://')).toBe(false);
    expect(MTBUtils.isValidUri('')).toBe(false);
})

test('Root Path Validation', async () => {
    expect(MTBUtils.isRootPath('/')).toBe(true);
    expect(MTBUtils.isRootPath('C:\\')).toBe(true);
    expect(MTBUtils.isRootPath('C:\\Program Files')).toBe(false);
    expect(MTBUtils.isRootPath('/home/user')).toBe(false);
    expect(MTBUtils.isRootPath('C:/Users/Username/Documents')).toBe(false);
    expect(MTBUtils.isRootPath('C:\\Windows\\System32')).toBe(false);
})
