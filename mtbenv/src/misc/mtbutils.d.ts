import winston from 'winston';
export declare class MTBUtils {
    private static readonly name1;
    private static readonly name2;
    static toolsRegex1: RegExp;
    static toolsRegex2: RegExp;
    static removeValuesFromArray<T>(sourceArray: T[], valuesToRemove: T[]): T[];
    static isValidUri(uri: string): boolean;
    static isRootPath(pathToCheck: string): boolean;
    static userInfineonDeveloperCenterRegistryDir(): string | undefined;
    static allInfineonDeveloperCenterRegistryDir(): string | undefined;
    static getCommonInstallLocation(): string | undefined;
    static readJSONFile(logger: winston.Logger, mod: string, file: string): any;
    static runProg(cmd: string, cwd: string, args: string[]): Promise<[number, string[]]>;
    static callMake(shtools: string, cwd: string, makeargs: string[]): Promise<[number, string[]]>;
    static callGetAppInfo(shtools: string, cwd: string): Promise<Map<string, string>>;
}
//# sourceMappingURL=mtbutils.d.ts.map