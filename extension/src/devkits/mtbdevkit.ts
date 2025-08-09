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

    public constructor(kptype: string, serial: string, mode: string, version: string, outdated: boolean) {
        this.kptype = kptype ;
        this.serial = serial ;
        this.mode = mode;
        this.version = version ;
        this.outdated = outdated;
    }

    public get info() : DevKitInfo {
        return {
            name: this.name || 'Unknown',
            serial: this.serial,
            firmwareVersion: this.version,
            boardFeatures: this.boardFeatures,
            kitProgType: this.kptype,
            usbMode: this.mode,
            bridgingTypes: this.bridgingProperties ? this.bridgingProperties.split(',') : [],
            fwOutOfDate: this.outdated,
        }
    }
} ;