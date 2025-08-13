import { MTBUtils } from "../mtbenv/misc/mtbutils";
import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import { SetupProgram } from "../comms";


export class IDCRegistry {
    private logger_: winston.Logger;
    private entries_: Map<string, SetupProgram> = new Map<string, SetupProgram>();

    constructor(logger: winston.Logger) {
        this.logger_ = logger;
    }

    public hasTool(featureId: string) : boolean {
        let ret = false ;
        let entry = this.entries_.get(featureId) ;
        if (entry && entry.path) {
            if (fs.existsSync(entry.path)) {
                ret = true ;
            }
        }
        return ret;
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

            this.logger_.debug(`packdbloader: scanning directory '${dir}'`) ;
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

    private checkOneJSONFile(file: string) {
        this.logger_.debug(`packdbloader: checking JSON file '${file}'`) ;
        let content = fs.readFileSync(file, 'utf-8');
        try {
            let obj = JSON.parse(content);
            if (obj.guid && obj.featureId && obj.title && obj.version) {
                this.entries_.set(obj.featureId, {
                    guid: obj.guid,
                    featureId: obj.featureId,
                    title: obj.title,
                    version: obj.version,
                    required: obj.required,
                    upgradable: obj.upgradable
                });
            }
        }
        catch(err) {
        }
    }
}
