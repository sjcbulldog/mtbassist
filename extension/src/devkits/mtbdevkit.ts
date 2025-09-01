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

import { DevKitInfo } from "../comms";


export class MTBDevKit {
    public readonly kptype: string ;
    public readonly serial : string ;
    public readonly mode: string;
    public readonly version: string ;
    public outdated: boolean ;
    public name: string | undefined ;
    public siliconID: string | undefined ;
    public targetInfo: string | undefined ;
    public programmingProperties : string | undefined ;
    public bridgingProperties : string | undefined ;
    public kitProg3Properties: string | undefined ;
    public qspiProperties : string | undefined ;
    public connectivityOptions: string | undefined ;
    public fram: string | undefined ;
    public boardFeatures: string[] = [] ;
    public present: boolean = true ;
    public bsp: string | undefined ;

    public constructor(kptype: string, serial: string, mode: string, version: string, outdated: boolean) {
        this.kptype = kptype ;
        this.serial = serial ;
        this.mode = mode;
        this.version = version ;
        this.outdated = outdated;
    }

    public info(bspChoices: string[]) : DevKitInfo {
        return {
            name: this.name || `Serial ${this.serial}`,
            serial: this.serial,
            firmwareVersion: this.version,
            boardFeatures: this.boardFeatures,
            kitProgType: this.kptype,
            usbMode: this.mode,
            bridgingTypes: this.bridgingProperties ? this.bridgingProperties.split(',') : [],
            fwOutOfDate: this.outdated,
            bsp: this.bsp || '',
            bspChoices: bspChoices,
            status: this.getStatus(bspChoices)
        } ;
    }

    private getStatus(bspChoices: string[]) : string {
        let index = bspChoices.findIndex(choice => choice === this.bsp);
        return index !== -1 ? 'Available' : 'BSP Not Available';
    }
} ;