import { MTBVersion } from "../misc/mtbversion";
import { MTBAssetRequest } from "./mtbassetreq";
import { MTBInstance } from "./mtbinstance";

export class MTBAssetInstance extends MTBInstance {
    constructor(rootpath: string, req? : MTBAssetRequest) {
        super(rootpath) ;
    }
}