/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as vscode from 'vscode';
import * as winston from 'winston';
import TransportStream = require('winston-transport');

export class VSCodeTransport extends TransportStream {
    private channel_ : vscode.OutputChannel;

    constructor(channel: vscode.OutputChannel) {
        super();
        this.channel_ = channel ;  
    }

    public log(info: winston.LogEntry, callback: () => void): void {
        let str = info.level ;
        if (str !== 'silly' && str !== 'debug') {
            if (info.timestamp) {
                str += ` [${info.timestamp}]`;
            }
            str += `: ${info.message}`;
            this.channel_.appendLine(str) ;
            if (info.stack) {
                this.channel_.appendLine(info.stack);
            }
        }
        callback();
    }
}
