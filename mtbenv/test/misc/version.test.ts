import { expect, test } from 'vitest' ;
import { MTBVersion } from '../../src/misc/mtbversion';

test('Version Create', async () => {
    expect(new MTBVersion()).toEqual(new MTBVersion(-1, -1, -1, -1));
    expect(new MTBVersion(1)).toEqual(new MTBVersion(1, -1, -1, -1));
    expect(new MTBVersion(1, 2)).toEqual(new MTBVersion(1, 2, -1, -1));
    expect(new MTBVersion(1, 2, 3)).toEqual(new MTBVersion(1, 2, 3, -1));
    expect(new MTBVersion(1, 2, 3, 4)).toEqual(new MTBVersion(1, 2, 3, 4));
});

test('Version Parsing', async () => {
    expect(MTBVersion.fromVersionString('1.2.3')).toEqual(new MTBVersion(1, 2, 3));
    expect(MTBVersion.fromVersionString('1.2.3.99')).toEqual(new MTBVersion(1, 2, 3, 99));
    expect(MTBVersion.fromVersionString('v1.2.3')).toEqual(new MTBVersion()) ;

    expect(MTBVersion.fromVVersionString('1.2.3')).toEqual(new MTBVersion());
    expect(MTBVersion.fromVVersionString('1.2.3.99')).toEqual(new MTBVersion());
    expect(MTBVersion.fromVVersionString('v1.2.3')).toEqual(new MTBVersion(1, 2, 3)) ;

    expect(MTBVersion.fromToolsVersionString('tools_1.2')).toEqual(new MTBVersion(1, 2, 0)) ;
    expect(MTBVersion.fromToolsVersionString('tools_1.2.3')).toEqual(new MTBVersion(1, 2, 3)) ;
}) ;

test('Version Comparison', async () => {
    const v1 = new MTBVersion(1, 2, 3);
    const v2 = new MTBVersion(1, 2, 4);
    const v3 = new MTBVersion(1, 3, 0);
    const v4 = new MTBVersion(2, 0, 0);

    expect(MTBVersion.compare(v1, v2)).toBe(-1);
    expect(MTBVersion.compare(v2, v1)).toBe(1);
    expect(MTBVersion.compare(v1, v3)).toBe(-1);
    expect(MTBVersion.compare(v3, v1)).toBe(1);
    expect(MTBVersion.compare(v1, v4)).toBe(-1);
    expect(MTBVersion.compare(v4, v1)).toBe(1);
    expect(MTBVersion.compare(v2, v3)).toBe(-1);
    expect(MTBVersion.compare(v3, v2)).toBe(1);
});

test('Version Comparison 2', async () => {
    const v1 = new MTBVersion(1, 2, 3);
    const v2 = new MTBVersion(1, 2, 4);
    const v3 = new MTBVersion(1, 3, 0);
    const v4 = new MTBVersion(2, 0, 0);

    expect(v1.isLessThen(v2)).toBe(true);
    expect(v2.isGreaterThen(v1)).toBe(true);
    expect(v1.isLessThen(v3)).toBe(true);   
    expect(v3.isGreaterThen(v1)).toBe(true);
    expect(v1.isLessThen(v4)).toBe(true);
    expect(v4.isGreaterThen(v1)).toBe(true);
    expect(v2.isLessThen(v3)).toBe(true);
    expect(v3.isGreaterThen(v2)).toBe(true);
    expect(v1.isEqual(v1)).toBe(true);
    expect(v1.isEqual(v2)).toBe(false);
    expect(v1.isEqual(new MTBVersion(1, 2, 3))).toBe(true);
    expect(v2.isEqual(new MTBVersion(1, 2, 4))).toBe(true);
    expect(v3.isEqual(new MTBVersion(1, 3, 0))).toBe(true);
    expect(v4.isEqual(new MTBVersion(2, 0, 0))).toBe(true);
    expect(v1.isEqual(new MTBVersion(1, 2, 3, 4))).toBe(false);
    expect(v2.isEqual(new MTBVersion(1, 2, 4, 5))).toBe(false);
    expect(v3.isEqual(new MTBVersion(1, 3, 0, 1))).toBe(false);
    expect(v4.isEqual(new MTBVersion(2, 0, 0, 1))).toBe(false);
});