import * as winston from 'winston';
import fetch, { Response } from 'node-fetch';

export class ToolList {
    private static readonly onlineToolURL = 'https://softwaretools.infineon.com/api/v1/tools/' ;

    private logger_ : winston.Logger;
    private list_ : any[] = [] ;

    constructor(logger: winston.Logger) {
        this.logger_ = logger;
    }

    public initialize() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.fetchToolManifest()
                .then((manifest) => {
                    this.list_ = manifest;
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
        return ret;
    }

    public getToolByFeature(feature: string): any | undefined {
        return this.list_.find(tool => tool.featureId === feature);
    }

    private fetchToolManifest() : Promise<any> {
        let ret = new Promise<any>((resolve, reject) => {
            // Fetch the tool manifest from the onlineToolURL
            fetch(ToolList.onlineToolURL)
                .then(response => {
                    if (!response.ok) {
                        reject(new Error('Network response was not ok'));
                    }
                    return response.json();
                })
                .then(data => {
                    resolve(data);
                })
                .catch(error => {
                    reject(error);
                });
        });
        return ret;
    }
}