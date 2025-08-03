import { Subject } from "rxjs";
import { BackEndToFrontEndResponse, BSPIdentifier, CodeExampleIdentifier, DevKitData } from "../../comms";
import { BackendService } from "./backend-service";

export class ManifestManager {
    private bspResolvers: (() => void)[] = [];
    private bsps: BSPIdentifier[] = [];
    private bspCategories: string[] = [];

    private codeExampleResolvers: (() => void)[] = [];
    private codeExamples: CodeExampleIdentifier[] = [] ;

    private parent_: BackendService;

    constructor(be: BackendService) {
        this.parent_ = be;
        this.refreshBSPs();
    }

    public refreshBSPs(): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.parent_.log('Refreshing BSPs');
            this.bspResolvers.push(resolve) ;            
            this.parent_.sendRequest(
                {
                    request: 'getDevKits',
                    data: null
                });
        });
        return ret;
    }

    public processCodeExamples(cmd: BackEndToFrontEndResponse): void {
        this.codeExamples = cmd.data as CodeExampleIdentifier[];
        for (let resolver of this.codeExampleResolvers) {
            resolver();
        }
    }

    public refreshCodeExamples(bspId: string): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.parent_.log(`Refreshing code examples for BSP: ${bspId}`);
            this.codeExampleResolvers.push(resolve);
            this.parent_.sendRequest(
                {
                    request: 'getCodeExamples',
                    data: { bspId: bspId }
                });
        });
        return ret;
    }

    public processDevKits(cmd: BackEndToFrontEndResponse): void {
        this.bsps = (cmd.data! as DevKitData).kits as BSPIdentifier[];
        this.bspCategories = [...new Set(this.bsps.map(bsp => bsp.category))];

        for (let resolver of this.bspResolvers) {
            resolver();
        }
    }

    public async getBSPCategories(): Promise<string[]> {
        return new Promise((resolve) => {
            if (this.bspCategories.length > 0) {
                this.parent_.log(`Returning cached BSP categories: ${this.bspCategories.join(', ')}`);
                resolve(this.bspCategories);
            }
            else {
                this.refreshBSPs()
                    .then(() => {
                        this.parent_.log(`Returning refreshed BSP categories: ${this.bspCategories.join(', ')}`);
                        resolve(this.bspCategories);
                    })
                    .catch(error => {
                        console.error('Error refreshing BSPs:', error);
                        resolve([]);
                    });
            }
        });
    }

    public async getBSPsForCategory(category: string): Promise<BSPIdentifier[]> {
        return new Promise((resolve) => {
            if (this.bsps.length) {
                const filtered = this.bsps.filter(kit => kit.category === category);
                if (filtered.length > 0) {
                    this.parent_.log(`Returning cached BSPs for category ${category}: ${filtered.map(k => k.name).join(', ')}`);
                    resolve(filtered);
                    return;
                }
            }
            else {
            this.refreshBSPs()
                .then(() => {
                    const filtered = this.bsps.filter(kit => kit.category === category);
                    if (filtered.length > 0) {
                        this.parent_.log(`Returning refreshed BSPs for category ${category}: ${filtered.map(k => k.name).join(', ')}`);
                        resolve(filtered);
                    } else {
                        this.parent_.log(`No BSPs found for category ${category}`);
                        resolve([]);
                    }
                })
                .catch(error => {   
                    console.error('Error refreshing BSPs:', error);
                    resolve([]);
                });
            }
        });
    }

    public async getExamplesForBSP(bspId: string): Promise<CodeExampleIdentifier[]> {
        return new Promise((resolve) => {
            this.refreshCodeExamples(bspId)
                .then(() => {
                    resolve(this.codeExamples) ;
                })
                .catch(error => {
                    console.error('Error refreshing code examples:', error);
                    resolve([]);
                });
        });
    }
}