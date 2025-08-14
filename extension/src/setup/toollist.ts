import * as winston from 'winston';
import fetch, { Response } from 'node-fetch';
import { SetupProgram } from '../comms';

export class ToolList {
    private static readonly onlineToolURL = 'https://softwaretools.infineon.com/api/v1/tools/' ;

    private logger_ : winston.Logger;
    private tools_ : Map<string, SetupProgram> = new Map();

    constructor(logger: winston.Logger) {
        this.logger_ = logger;
    }

    public initialize() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.fetchToolManifest()
                .then((manifest) => {
                    if (Array.isArray(manifest)) {
                        for (let tool of manifest) {
                            if (tool.featureId) {
                                this.tools_.set(tool.featureId, tool);
                            }
                        }
                    }
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
        return ret;
    }

    public hasTool(feature: string): boolean {
        return this.tools_.has(feature);
    }

    public getToolByFeature(feature: string): SetupProgram | undefined {
        return this.tools_.get(feature);
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