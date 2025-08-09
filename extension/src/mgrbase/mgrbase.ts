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