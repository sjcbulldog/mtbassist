import * as vscode from 'vscode';
import * as winston from 'winston';
import TransportStream = require('winston-transport');

export class ConsoleTransport extends TransportStream {
    constructor() {
        super();
    }

    log(info: winston.LogEntry, callback: () => void): void {
        let str = 'mtbassist: ' + info.level ;
        if (info.timestamp) {
            str += ` [${info.timestamp}]`;
        }
        str += `: ${info.message}`;
        console.log(str);
        if (info.stack) {
            console.log(info.stack);
        }
        callback();
    }
}
