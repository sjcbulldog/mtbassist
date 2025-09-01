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


export class MTBPack {
    private id_: string ;
    private desc_ : any ;

    constructor(id: string, obj: any) {
        this.id_ = id ;
        this.desc_ = obj ;
    }

    public packType() : string {
        return this.desc_.attributes['pack-type'] ;
    }

    public path() : string {
        return this.desc_.path ;
    }

    public get featureId() : string {
        return this.id_ ;
    }
}