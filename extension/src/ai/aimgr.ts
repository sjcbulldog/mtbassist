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

import EventEmitter = require("events");
import { MTBAssistObject } from "../extobj/mtbassistobj";

var request = require("request");

export class AIManager extends EventEmitter {
    private static readonly refreshInterval: number = 30 * 60 * 1000; 
    private ext_ : MTBAssistObject ;
    private apiKey: any ;
    
    constructor(ext: MTBAssistObject) {
        super() ;
        this.ext_ = ext;
    }

    public get key() : any {
        return this.apiKey;
    }

    public initialize() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.getAPIKey().then((key) => {
                this.apiKey = key ;
                this.ext_.logger.debug('AI manager initialized sucessfully') ;
                this.emit('apikey', this.apiKey) ;
                setInterval(this.refreshToken.bind(this), AIManager.refreshInterval) ;
                resolve() ;
            })
            .catch((err) => {
                this.ext_.logger.error(`Failed to initialize AIManager: ${err.message}`);
                resolve();
            });
        });
        return ret;
    }

    private refreshToken() {
        this.getAPIKey().then((key) => {
            this.apiKey = key;
            this.ext_.logger.debug('AI manager refreshed token successfully');
            this.emit('apikey', this.apiKey);
        })
        .catch((err) => {
            this.ext_.logger.error(`Failed to refresh AIManager token: ${err.message}`);
        });
    }

    private getAPIKey() : Promise<any> {
        let ret = new Promise<any>((resolve, reject) => {

            let req = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                client_id: "",
                // eslint-disable-next-line @typescript-eslint/naming-convention
                client_secret: "",

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
