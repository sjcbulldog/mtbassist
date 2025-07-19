import * as fs from "fs" ;
import * as path from "path" ;
import { MTBAssetInstance } from "./mtbassetinst";

export class MTBBspInstance extends MTBAssetInstance {

    constructor(rootpath: string) {
        super(rootpath) ;
    }

    public static createFromPath(bsppath: string) : MTBBspInstance {
        let ret : MTBBspInstance = new MTBBspInstance(bsppath) ;
        return ret;
    }
}
