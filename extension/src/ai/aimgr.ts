import { MTBAssistObject } from "../extobj/mtbassistobj";

var request = require("request");

export class AIManager {
    private ext_ : MTBAssistObject ;
    private apiKey: any ;
    
    constructor(ext: MTBAssistObject) {
        this.ext_ = ext;
    }

    public initialize() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.getAPIKey().then(() => {
                this.ext_.logger.debug('AI manager initialized sucessfully') ;
            })
            .catch((err) => {
                this.ext_.logger.error(`Failed to initialize AIManager: ${err.message}`);
                resolve();
            });
        });
        return ret;
    }

    private getAPIKey() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {

            let req = {
                // eslint-disable-next-line @typescript-eslint/naming-convention            
                client_id: "UYet54C32fMCcbR8rWUfjC1E1IC4PW7j",
                // eslint-disable-next-line @typescript-eslint/naming-convention
                client_secret: "3rqt9WIBs5GHnrqt0DNoIKtiejFUpThu3lkRMsJ1Rlz7OvNflMjCSYyWNK-pi93w",
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
                obj.apiKey = JSON.parse(body).access_token;
            });        
        }) ;
        return ret;
    }    
}
