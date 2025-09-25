import EventEmitter = require("events");

export abstract class STask extends EventEmitter {

    private ok_ : boolean = false ;

    public constructor() {
        super();
    }

    abstract run() : Promise<void> ;

    public get ok() : boolean {
        return this.ok_ ;
    }

    public startOperation(message: string) {
        this.emit('startOperation', message );
    }

    public finishOperation(ok: boolean) {
        this.ok_ = ok ;
        this.emit('finishOperation');
    }

    public addStatusLine(line: string) {
        this.emit('addStatusLine', line);
    }

    public reveal() {
        this.emit('reveal');
    }
}