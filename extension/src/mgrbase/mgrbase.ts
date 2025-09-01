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

import * as winston from 'winston';
import { MTBAssistObject } from "../extobj/mtbassistobj";
import EventEmitter = require('events');

export class MtbManagerBase extends EventEmitter {
    private ext_ : MTBAssistObject ;

    public constructor(ext: MTBAssistObject) {
        super() ;
        this.ext_ = ext ;
    }

    protected get ext() : MTBAssistObject {
        return this.ext_ ;
    }

    protected get logger() : winston.Logger {
        return this.ext_.logger ;
    }
}