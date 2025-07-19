import { URI } from 'vscode-uri';
import { MTBItem } from './mtbitem';
import { MTBItemVersion } from './mtbitemversion';
import winston from 'winston';
export declare class MTBBoard extends MTBItem {
    readonly category: string;
    readonly description: string;
    readonly summary: string;
    readonly boardUri: URI;
    readonly documentationUri: URI;
    readonly provides: string[];
    readonly chips: Map<string, string>;
    constructor(src: URI, id: string, name: string, category: string, desc: string, summary: string, boardUri: URI, docUri: URI, provs: string[], chips: Map<string, string>, versions: MTBItemVersion[]);
    chipString(): string;
    static compareChips(c1: Map<string, string>, c2: Map<string, string>): boolean;
    static merge(logger: winston.Logger, board1: MTBBoard, board2: MTBBoard): MTBBoard | undefined;
}
//# sourceMappingURL=mtbboard.d.ts.map