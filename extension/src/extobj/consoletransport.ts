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

/**
 * ConsoleTransport - Custom Winston transport for logging to browser console
 * 
 * This class implements a custom Winston transport that outputs log messages
 * to the browser console. It's designed for use in VS Code extension environments
 * where standard console output is captured and displayed in the developer console.
 * The transport formats messages with a consistent prefix and timestamp for
 * easy identification and debugging.
 */
export class ConsoleTransport extends TransportStream {
    /**
     * Constructor - Initialize the console transport
     * 
     * Creates a new console transport instance that inherits from Winston's
     * TransportStream base class. No additional configuration is required
     * as this transport uses default console.log for output.
     */
    constructor() {
        super();
    }

    /**
     * Log method - Process and output log entries to console
     * 
     * Formats log entries with a consistent structure including the extension name,
     * log level, optional timestamp, and message content. Also handles stack traces
     * for error entries. This method is called by Winston when a log entry needs
     * to be processed by this transport.
     * 
     * @param info - Winston log entry containing level, message, timestamp, and optional stack
     * @param callback - Callback function to invoke when logging is complete
     */
    public log(info: winston.LogEntry, callback: () => void): void {
        // Build formatted log message with extension prefix and level
        let str = 'mtbassist: ' + info.level ;
        
        // Add timestamp if available
        if (info.timestamp) {
            str += ` [${info.timestamp}]`;
        }
        
        // Append the actual log message
        str += `: ${info.message}`;
        
        // Output the formatted message to console
        console.log(str);
        
        // If there's a stack trace (typically for errors), log it separately
        if (info.stack) {
            console.log(info.stack);
        }
        
        // Notify Winston that logging is complete
        callback();
    }
}
