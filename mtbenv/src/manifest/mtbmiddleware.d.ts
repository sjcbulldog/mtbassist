import { URI } from 'vscode-uri';
import { MTBItem } from './mtbitem';
import { MTBItemVersion } from './mtbitemversion';
import winston from 'winston';
export declare class MTBMiddleware extends MTBItem {
    readonly uri: URI;
    readonly description: string;
    readonly category: string;
    readonly requirements: string[];
    constructor(src: URI, id: string, name: string, uri: URI, desc: string, cat: string, reqs: string[], versions: MTBItemVersion[]);
    static merge(logger: winston.Logger, middleware1: MTBMiddleware, middleware2: MTBMiddleware): MTBMiddleware | undefined;
}
//# sourceMappingURL=mtbmiddleware.d.ts.map