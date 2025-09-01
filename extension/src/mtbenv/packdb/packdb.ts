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

import * as path from 'path';
import * as fs from 'fs' ;
import * as os from 'os' ;
import { MTBPack } from "./mtbpack";
import { URI } from 'vscode-uri';
import { MTBNames } from '../misc/mtbnames';

export interface PackManifest {
    uripath: URI,
    iseap: boolean
}

export class PackDB {
    private packs_ : Map<string, MTBPack> = new Map() ;

    constructor() {
    }

    public get isEarlyAccessPackActive() : boolean {
        return this.eap !== undefined ;
    }

    public get eap() : MTBPack | undefined {
        if (process.env.MTB_ENABLE_EARLY_ACCESS) {
            let pack = this.packs_.get(process.env.MTB_ENABLE_EARLY_ACCESS) ;
            if (pack && pack.packType() === MTBNames.EarlyAccessPack) {
                return pack ;
            }
        }

        // TODO: merge this with the overall settings
        let settings = path.join(os.homedir(), '.modustoolbox', 'settings.json') ;
        if (fs.existsSync(settings)) {
            let data = JSON.parse(fs.readFileSync(settings, 'utf8')) ;
            if (data && data.mtb && data.mtb.enabled_eap) {
                let pack = this.packs_.get(data.mtb.enabled_eap) ;
                if (pack && pack.packType() === 'early-access-pack') {
                    return pack ;
                }
            }
        }        
        return undefined ;
    }

    public get techPacks() : MTBPack[] {
        let packs : MTBPack[] = [] ;
        this.packs_.forEach((pack) => {
            if (pack.packType() === 'tech-pack') {
                packs.push(pack) ;
            }
        });
        return packs ;
    }

    public get eaps() : MTBPack[] {
        let packs : MTBPack[] = [] ;
        this.packs_.forEach((pack) => {
            if (pack.packType() === 'early-access-pack') {
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

    public getManifestFiles() : PackManifest[] {
        let ret : PackManifest[] = [];
        for(let pack of this.getActivePacks()) {
            let file = path.join(pack.path(), 'manifest.xml') ;
            if (fs.existsSync(file) && fs.statSync(file).isFile()) {
                let uri = URI.file(file) ;
                ret.push({ uripath: uri, iseap: pack.packType() === 'early-access-pack' }) ;
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
        for(let pack of this.packs_.values()) {
            if (pack.packType() !== 'early-access-pack') {
                packs.push(pack) ;
            }
        }

        if (this.isEarlyAccessPackActive) {
            packs.push(this.eap!) ;
        }
        return packs ;
    }
}
