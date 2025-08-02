import * as vscode from 'vscode';
import * as winston from 'winston';
import TransportStream = require('winston-transport');

export class VSCodeTransport extends TransportStream {
    private channel_ : vscode.OutputChannel;
    constructor() {
        super();
        this.channel_ = vscode.window.createOutputChannel("ModusToolbox") ;        
    }

    log(info: winston.LogEntry, callback: () => void): void {
        let str = info.level ;
        if (info.timestamp) {
            str += ` [${info.timestamp}]`;
        }
        str += `: ${info.message}`;
        this.channel_.appendLine(str) ;
        if (info.stack) {
            this.channel_.appendLine(info.stack);
        }
        callback();
    }
}
