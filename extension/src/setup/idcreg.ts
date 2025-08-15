import { MTBUtils } from "../mtbenv/misc/mtbutils";
import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import { SetupProgram } from "../comms";
import { MTBVersion } from "../mtbenv/misc/mtbversion";

export class IDCRegistry {
    private logger_: winston.Logger;
    private entries_: Map<string, SetupProgram[]> = new Map<string, SetupProgram[]>();

    constructor(logger: winston.Logger) {
        this.logger_ = logger;
    }

    public hasTool(featureId: string) : boolean {
        let ret = false ;
        let list = this.entries_.get(featureId) ;
        if (list) {
            for(let entry of list) {
                if (entry && entry.path) {
                    if (fs.existsSync(entry.path)) {
                        ret = true ;
                    }
                }
            }
        }
        return ret;
    }

    public getToolByFeatureId(featureId: string) : SetupProgram | undefined {
        let list = this.entries_.get(featureId) ;
        if (!list) {
            return undefined ;
        }
        return list[0] ;
    }

    public initialize() : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {  
            let parray : Promise<void>[] = [] ;

            let name = MTBUtils.userInfineonDeveloperCenterRegistryDir();
            if (name) {
                let p = this.scanDir(name) ;
                parray.push(p) ;
            }

            name = MTBUtils.allInfineonDeveloperCenterRegistryDir();
            if (name) {
                let p = this.scanDir(name);
                parray.push(p);
            }

            Promise.all(parray).then(() => {
                resolve();
            }).catch((err) => {
                reject(err);
            });
        }) ;
        return ret ;
    }

    private scanDir(dir: string) : Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            if (!fs.existsSync(dir)) {
                this.logger_.info(`packdbloader: directory '${dir}' does not exist - skipping`) ;
                resolve() ;
                return ;
            }

            this.logger_.debug(`idcreg: scanning directory '${dir}'`) ;
            for(let file of fs.readdirSync(dir)) {
                let fullpath = path.join(dir, file) ;
                if (path.extname(file) === '.json') {
                    this.checkOneJSONFile(fullpath) ;
                }
            }
            resolve() ;
        }) ;

        return ret ;
    }

    private compareTwoTools(a: SetupProgram, b: SetupProgram) : number {
        let aver = MTBVersion.fromVersionString(a.version) ;
        let bver = MTBVersion.fromVersionString(b.version) ;
        return MTBVersion.compare(bver, aver) ;
    }

    private checkOneJSONFile(file: string) {
        this.logger_.debug(`idcreg: checking JSON file '${file}'`) ;
        let content = fs.readFileSync(file, 'utf-8');
        try {
            content = content.replace(/^\uFEFF/, ''); // Remove BOM if present
            let obj = JSON.parse(content);
            if (obj.guid && obj.featureId && obj.title && obj.version && obj.path) {
                if (!this.entries_.has(obj.featureId)) {
                    this.entries_.set(obj.featureId, []);
                }
                let set = this.entries_.get(obj.featureId)!;
                set.push({
                    featureId: obj.featureId,
                    name: obj.name,
                    version: obj.version,
                    required: obj.required,
                    upgradable: obj.upgradable,
                    path: obj.path,
                    installed: true
                });
                set.sort((a, b) => {
                    return this.compareTwoTools(a, b);
                });
            }
        }
        catch(err) {
            this.logger_.error(`idcreg: error parsing JSON file '${file}': ${(err as Error).message}`);
        }
    }
}
