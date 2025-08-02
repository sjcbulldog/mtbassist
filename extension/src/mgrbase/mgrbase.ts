import * as winston from 'winston';
import { MTBAssistObject } from "../extobj/mtbassistobj";

export class MtbManagerBase {
    private ext_ : MTBAssistObject ;

    public constructor(ext: MTBAssistObject) {
        this.ext_ = ext ;
    }

    protected get ext() : MTBAssistObject {
        return this.ext_ ;
    }

    protected get logger() : winston.Logger {
        return this.ext_.logger ;
    }
}