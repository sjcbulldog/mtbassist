import { ModusToolboxEnvironment } from "mtbenv";
import winston from "winston";

export class MTBSearch {
    private args_ : string[] ;
    private env_ : ModusToolboxEnvironment | null = null ;
    private console_log_ : boolean = true ;
    private file_log_? : boolean = false ;
    private project_path_? : string ;

    constructor(args: string[]) {
        this.args_ = args ;
    }

    public run() : Promise<void> {
        this.processArgs() ;

        let ret = new Promise<void>((resolve, reject) => {
            let logger = winston.createLogger({
                transports: [new winston.transports.Console()]
            });
            this.env_ = ModusToolboxEnvironment.getInstance(logger, this.project_path_) ;
            if (this.env_ === null) {
                reject(new Error("Failed to create ModusToolboxEnvironment instance."));
                return;
            }
        });
        return ret;
    }

    private processArgs() {
    }
}