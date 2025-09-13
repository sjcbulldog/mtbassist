import { MTBVersion } from "../mtbenv/misc/mtbversion";

export class InstalledFeature {
    private featureId_: string ;
    private version_ : MTBVersion ;
    private installPath_ : string ;

    public constructor(featureId: string, version: MTBVersion, installPath: string) {
        this.featureId_ = featureId ;
        this.version_ = version ;
        this.installPath_ = installPath ;
    }

    public get featureId() : string {
        return this.featureId_ ;
    }

    public get version() : MTBVersion {
        return this.version_ ;
    }

    public get installPath() : string {
        return this.installPath_ ;
    }
}