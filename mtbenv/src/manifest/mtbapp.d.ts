import winston from 'winston';
import { MTBItem } from './mtbitem';
import { MTBItemVersion } from './mtbitemversion';
import { URI } from 'vscode-uri';
export declare class MTBApp extends MTBItem {
    readonly description: string;
    readonly requirements: string[];
    readonly uri: URI;
    constructor(src: URI, name: string, id: string, uri: URI, description: string, requirements: string[], versions: MTBItemVersion[]);
    static merge(logger: winston.Logger, app1: MTBApp, app2: MTBApp): MTBApp | undefined;
}
//# sourceMappingURL=mtbapp.d.ts.map