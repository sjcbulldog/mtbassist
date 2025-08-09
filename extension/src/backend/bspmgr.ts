import { ModusToolboxEnvironment } from "../mtbenv/mtbenv/mtbenv";
import * as path from 'path' ;
import * as fs from 'fs' ;
import { MTBLoadFlags } from "../mtbenv/mtbenv/loadflags";
import { BSPIdentifier, BSPData } from "../comms";

export class BSPMgr {
    private extdir_: string ;
    private env_ : ModusToolboxEnvironment;
    private bsps_: BSPData ;
    private waiting_ : ((data: BSPData) => void)[] = [] ;

    constructor(extdir: string, env: ModusToolboxEnvironment) {
        this.extdir_ = extdir;
        this.env_ = env;
        this.bsps_ = {
            datatype: 'empty',
            bsps: []
        };

        this.env_.on('loaded', this.appLoaded.bind(this));
        this.readCachedKits();
    }

    public getDevKits(live?: boolean): Promise<BSPData> {
        let ret = new Promise<BSPData>((resolve, reject) => {
            if (live) {
                //
                // We want live data from the manifest
                //
                if (this.bsps_.datatype === 'manifest' || this.bsps_.datatype === 'error') {
                    resolve(this.bsps_) ;
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
                resolve(this.bsps_) ;
            }
        }) ;
        return ret;
    }

    private loadError(err: Error): void {
        this.bsps_ = {
            datatype: 'error',
            bsps: [ {
                name: err.message, 
                id: '', category: '',
                device: "",
                connectivity: "",
                description: "An error occurred while loading BSPs: " + err.message
            } ]
        } ;

        for(let p of this.waiting_) {
            p(this.bsps_) ;
        }        
    }

    private appLoaded(loaded: MTBLoadFlags) : void {
        if (loaded & MTBLoadFlags.Manifest) {
            this.bsps_.datatype = 'manifest';
            this.bsps_.bsps = [] ;
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
                this.bsps_.bsps.push(id);
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
                p(this.bsps_) ;
            }
        }
    }

    private writeCachedKits(): void {
        let kitsFile = path.join(this.extdir_, 'devkits.json');
        try {
            let kits : BSPData = { 
                datatype: 'cached',
                bsps: this.bsps_.bsps
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
                this.bsps_ = JSON.parse(data);
                this.bsps_.datatype = 'cached';
            } else {
                this.bsps_ = { datatype: 'empty', bsps: [] };
            }
        } catch (error) {
            console.error("Error reading cached kits:", error);
            this.bsps_ = { datatype: 'empty', bsps: [] };
        }
    }
}