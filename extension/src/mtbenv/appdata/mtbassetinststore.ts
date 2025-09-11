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

import { MTBAssetInstance } from "./mtbassetinst";

export class MTBAssetInstStore {
    private assetInstances_: Map<string, MTBAssetInstance> = new Map() ;

    public addAssetInstance(inst: MTBAssetInstance) {
        if (!inst.rootdir) {
            throw new Error('Asset instance must have a root directory') ;
        }

        this.assetInstances_.set(inst.rootdir, inst) ;
    }

    public findAssetInstanceByPath(fpath: string) : MTBAssetInstance | undefined {
        return this.assetInstances_.get(fpath) ;
    }

    public removeAssetInstance(id: string) {
        this.assetInstances_.delete(id) ;
    }

    public clear() : void {
        this.assetInstances_.clear() ;
    }

    public get assetInstances() : IterableIterator<MTBAssetInstance> {
        return this.assetInstances_.values() ;
    }

    public findAssetInstanceByName(name: string) : MTBAssetInstance | undefined {
        for (let inst of this.assetInstances_.values()) {
            if (inst.name === name) {
                return inst ;
            }
        }
        return undefined ;
    }
}