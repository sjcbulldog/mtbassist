import * as path from 'path';
import * as fs from 'fs' ;
import { MTBPack } from "./mtbpack";
import { URI } from 'vscode-uri';
import { MTBNames } from '../misc/mtbnames';

export class PackDB {
    private packs_ : Map<string, MTBPack> = new Map() ;

    constructor() {
    }

    public get isEarlyAccessPackActive() : boolean {
        if (process.env.MTB_ENABLE_EARLY_ACCESS) {
            let pack = this.packs_.get(process.env.MTB_ENABLE_EARLY_ACCESS) ;
            if (pack && pack.packType() === 'early-access-pack') {
                return true ;
            }
        }
        return false ;
    }

    public get eap() : MTBPack | undefined {
        if (process.env.MTB_ENABLE_EARLY_ACCESS) {
            let pack = this.packs_.get(process.env.MTB_ENABLE_EARLY_ACCESS) ;
            if (pack && pack.packType() === MTBNames.EarlyAccessPack) {
                return pack ;
            }
        }
        return undefined ;
    }

    public getTechPacks() : MTBPack[] {
        let packs : MTBPack[] = [] ;
        this.packs_.forEach((pack) => {
            if (pack.packType() === 'tech-pack') {
                packs.push(pack) ;
            }
        });
        return packs ;
    }

    public addPack(obj: any) {
        if (obj.featureId && obj.attributes['pack-type'] && obj.path && obj.type === 'content-pack') {
            let pack = new MTBPack(obj.featureId, obj) ;
            this.packs_.set(obj.featureId, pack) ;
        }
    }

    public getManifestFiles() : string [] {
        let ret = [] ;
        for(let pack of this.getActivePacks()) {
            let file = path.join(pack.path(), 'manifest.xml') ;
            if (fs.existsSync(file) && fs.statSync(file).isFile()) {
                ret.push(URI.file(file).toString()) ;
            }
        }
        return ret ;
    }

    public getToolsDirs() : string[] {
        let ret = [] ;
        for(let pack of this.getActivePacks()) {
            let dir = path.join(pack.path(), 'tools') ;
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                ret.push(dir) ;
            }
        }

        return ret;
    }

    public getActivePacks() : MTBPack[] {
        let packs : MTBPack[] = [] ;
        this.packs_.forEach((pack) => {
            if (pack.packType() !== 'early-access-pack') {
                packs.push(pack) ;
            }
            else if (process.env.MTB_ENABLE_EARLY_ACCESS && process.env.MTB_ENABLE_EARLY_ACCESS === pack.featureId()) {
                packs.push(pack) ;
            }
        });
        return packs ;
    }
}
