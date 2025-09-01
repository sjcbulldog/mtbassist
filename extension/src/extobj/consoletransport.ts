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
