import { ModusToolboxEnvironment } from "../mtbenv/mtbenv/mtbenv";
import * as path from 'path' ;
import * as fs from 'fs' ;
import { MTBLoadFlags } from "../mtbenv/mtbenv/loadflags";
import { BSPIdentifier, DevKitData } from "../comms";

export class BSPMgr {
    private extdir_: string ;
    private env_ : ModusToolboxEnvironment;
    private devkits_: DevKitData ;
    private waiting_ : ((data: DevKitData) => void)[] = [] ;

    constructor(extdir: string, env: ModusToolboxEnvironment) {
        this.extdir_ = extdir;
        this.env_ = env;
        this.devkits_ = {
            datatype: 'empty',
            kits: []
        };

        this.env_.on('loaded', this.appLoaded.bind(this));
        this.readCachedKits();
    }

    public getDevKits(live?: boolean): Promise<DevKitData> {
        let ret = new Promise<DevKitData>((resolve, reject) => {
            if (live) {
                //
                // We want live data from the manifest
                //
                if (this.devkits_.datatype === 'manifest' || this.devkits_.datatype === 'error') {
                    resolve(this.devkits_) ;
                    return ;
                }

                //
                // Otherwise, we must wait for the live data to be loaded
                //
                this.waiting_.push(resolve) ;
            }
            else {
                //
                // We want any data, either cached or from the manifest
                //
                resolve(this.devkits_) ;
            }
        }) ;
        return ret;
    }

    private loadError(err: Error): void {
        this.devkits_ = {
            datatype: 'error',
            kits: [ {
                name: err.message, 
                id: '', category: '',
                device: "",
                connectivity: "",
                description: "An error occurred while loading BSPs: " + err.message
            } ]
        } ;

        for(let p of this.waiting_) {
            p(this.devkits_) ;
        }        
    }

    private appLoaded(loaded: MTBLoadFlags) : void {
        if (loaded & MTBLoadFlags.Manifest) {
            this.devkits_.datatype = 'manifest';
            this.devkits_.kits = [] ;
            for(let board of this.env_.manifestDB.bsps.values()) {
                let id : BSPIdentifier = { 
                    name: board.name, 
                    id: board.id, 
                    category: board.category, 
                    device: '', 
                    connectivity: '',
                    description: board.description || ''
                };
                if (board.chips.has('mcu')) {
                    id.device = board.chips.get('mcu')! ;
                }

                if (board.chips.has('radio')) {
                    id.connectivity = board.chips.get('radio')! ;
                }
                this.devkits_.kits.push(id);
            }

            //
            // Write the most recent received data to the cache file
            //
            this.writeCachedKits() ;

            //
            // Iterate through all waiting promises that are waiting on dev kit data
            // and resolve them with the current devkits data.
            //
            for(let p of this.waiting_) {
                p(this.devkits_) ;
            }
        }
    }

    private writeCachedKits(): void {
        let kitsFile = path.join(this.extdir_, 'devkits.json');
        try {
            let kits : DevKitData = { 
                datatype: 'cached',
                kits: this.devkits_.kits
            } ;
            fs.writeFileSync(kitsFile, JSON.stringify(kits, null, 2), 'utf-8');
        } catch (error) {
            console.error("Error writing cached kits:", error);
        }
    }

    private readCachedKits(): void {
        let kitsFile = path.join(this.extdir_, 'devkits.json');
        try {
            if (fs.existsSync(kitsFile)) {
                const data = fs.readFileSync(kitsFile, 'utf-8');
                this.devkits_ = JSON.parse(data);
                this.devkits_.datatype = 'cached';
            } else {
                this.devkits_ = { datatype: 'empty', kits: [] };
            }
        } catch (error) {
            console.error("Error reading cached kits:", error);
            this.devkits_ = { datatype: 'empty', kits: [] };
        }
    }
}