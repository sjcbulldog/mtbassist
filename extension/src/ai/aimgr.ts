import EventEmitter = require("events");
import { MTBAssistObject } from "../extobj/mtbassistobj";

var request = require("request");

export class AIManager extends EventEmitter {
    private ext_ : MTBAssistObject ;
    private apiKey: any ;
    
    constructor(ext: MTBAssistObject) {
        super() ;
        this.ext_ = ext;
    }

    public initialize() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.getAPIKey().then((key) => {
                this.apiKey = key ;
                this.ext_.logger.debug('AI manager initialized sucessfully') ;
                this.emit('apikey', this.apiKey) ;
            })
            .catch((err) => {
                this.ext_.logger.error(`Failed to initialize AIManager: ${err.message}`);
                resolve();
            });
        });
        return ret;
    }

    private getAPIKey() : Promise<any> {
        let ret = new Promise<any>((resolve, reject) => {

            let req = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                client_id: "<client_id>",
                // eslint-disable-next-line @typescript-eslint/naming-convention
                client_secret: "<client_secret>",

                audience: "wss://ws.api.ept.ai",

                // eslint-disable-next-line @typescript-eslint/naming-convention            
                grant_type: "client_credentials"
            } ;

            let options = { 
                method: 'POST',
                url: 'https://dev-t45vwan1ilnqniwu.us.auth0.com/oauth/token',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(req)
            };

            let obj = this ;
            request(options, function (error: string | undefined, response: any, body: any) {
                try {
                    resolve(JSON.parse(body)) ;
                } catch (e) {
                    reject(e);
                }
            });        
        }) ;
        return ret;
    }    
}
