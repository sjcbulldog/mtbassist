import { Subject } from "rxjs";
import { BackEndToFrontEndResponse, BSPIdentifier, CodeExampleIdentifier, BSPData } from "../../comms";
import { BackendService } from "./backend-service";

export class ManifestManager {
    private bspResolvers: (() => void)[] = [];
    private bsps: BSPIdentifier[] = [];
    private bspCategories: string[] = [];

    private codeExampleResolvers: (() => void)[] = [];
    private codeExamples: CodeExampleIdentifier[] = [] ;
    private codeExampleCategories: string[] = [] ;

    private parent_: BackendService;

    constructor(be: BackendService) {
        this.parent_ = be;
        this.refreshBSPs();

        this.parent_.registerHandler('setBSPs', this.processBSPs.bind(this));
        this.parent_.registerHandler('setCodeExamples', this.processCodeExamples.bind(this));
    }

    public refreshBSPs(): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.parent_.log('Refreshing BSPs');
            this.bspResolvers.push(resolve) ;            
            this.parent_.sendRequest(
                {
                    request: 'getBSPs',
                    data: null
                });
        });
        return ret;
    }

    public processCodeExamples(cmd: BackEndToFrontEndResponse): void {
        this.codeExamples = cmd.data as CodeExampleIdentifier[];
        this.codeExampleCategories = [...new Set(this.codeExamples.map(example => example.category))];
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

    public processBSPs(cmd: BackEndToFrontEndResponse): void {
        this.bsps = (cmd.data! as BSPData).bsps as BSPIdentifier[];
        this.bspCategories = [...new Set(this.bsps.map(bsp => bsp.category))];
        this.parent_.log(`Processed BSPs: ${this.bsps.length} found, categories: ${this.bspCategories.join(', ')}`);

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