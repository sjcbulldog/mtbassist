import { DeviceDBManager } from "../devdb/devdbmgr";
import * as path from 'path' ;
import * as fs from 'fs' ;
import * as zlib from 'zlib' ;
import { ModusToolboxEnvironment } from "../mtbenv";

export interface BusMaster {
    index: number ;
    type: string ;
    viewId: string ;
}

export interface PhysicalMemory {
    description: string ;
    displayName: string ;
    memoryId: string ;
    reservationId?: string ;
    size: number ;
    capabilities: string[] ;
}

export interface ExternalReservation {
    reservationId: string ;
    size : number ;
}

export interface View {
    address: number,
    mapId: string,
    memoryId: string,
    offset: number,
    size: number,
    suffix: string,
    capabilitiesAdd: string[],
    capabilitiesRemove: string[],
    memory? : PhysicalMemory ;
}

export interface MemoryView {
    viewId: string ;
    memviews: View[] ;
}

export class MemoryMap {
    private readonly dbFileTag = 'PSOCCREATORDATAFILE' ;
    private readonly keyString = 'Cypress' ;

    private devdb_ : DeviceDBManager ;
    private env_ : ModusToolboxEnvironment ;
    private memviews_: MemoryView[] = [] ;
    private physicalMemories_: PhysicalMemory[] = [] ;
    private externalMemories_: PhysicalMemory[] = [] ;
    private externalReservation_: ExternalReservation[] = [] ;
    private busMasters_: BusMaster[] = [] ;

    public constructor(private devdb: DeviceDBManager, private env: ModusToolboxEnvironment) {
        this.devdb_ = devdb ;
        this.env_ = env ;
    }

    public get isValid() : boolean {
        return this.memviews_.length > 0 && this.physicalMemories_.length > 0 ;
    }

    public get physicalMemories() : PhysicalMemory[] {
        return [...this.physicalMemories_, ...this.externalMemories_] ;
    }

    public memoryViewFromViewName(name: string) : MemoryView | undefined {
        return this.memviews_.find( mv => mv.viewId === name ) ;
    }

    public getViewForName(name: string) : View | undefined { 
        for(let mv of this.memviews_) {
            let v = mv.memviews.find( v => v.mapId === name ) ;
            if (v) {
                return v ;
            }
        }
        return undefined ;
    }

    public getMemoryMap(): Promise<void> {
        let ret = new Promise<void>( (resolve, reject) => {
            let device = this.env_.appInfo!.projects[0].device ;
            let xmlstr = this.getMemoryMapFile(this.devdb_, device) ;
            if (xmlstr === null) {
                resolve() ;
                return ;
            }

            this.extractMemoryData(xmlstr)
            .then((memdata) => {
                if (!memdata || !memdata.Memories || !memdata.Memories.MemoryViews || !memdata.Memories.MemoryViews.MemoryView ||
                            !memdata.Memories.PhysicalMemories || !memdata.Memories.PhysicalMemories.PhysicalMemory ) {
                    resolve() ;
                    return ;
                }

                try {
                    if (!this.extractBusMasters(memdata.Memories.BusMasters)) {
                        resolve() ;
                    }

                    if (!this.extractPhysicalMemories(memdata.Memories.PhysicalMemories)) {
                        resolve() ;
                    }

                    if (!this.extractMemoryViews(memdata.Memories.MemoryViews)) {
                        resolve() ;
                    }
                }
                catch(e) {
                    resolve() ;
                    return ;
                }

                this.readQSPIFlashInfo(device)
                .then(() => {   
                    this.linkViewsAndMemories() ;
                    resolve() ;
                })
                .catch((err) => {  
                    reject(err) ;
                });
            })
            .catch((err) => {  
                reject(err) ;
            }) ;
        }) ;
        return ret ;
    }

    private readQSPIFlashInfo(device: string): Promise<void> {
        var parseString = require('xml2js').parseString;
        let ret = new Promise<void>( (resolve, reject) => {
            let qspiFile = path.join(this.env_.appInfo?.generatedSourceDir!, 'design.cyqspi.memory-export') ;
            if (qspiFile && fs.existsSync(qspiFile)) {
                let data: string ;
                
                try { 
                    data = fs.readFileSync(qspiFile, 'utf-8') ;
                }
                catch(err) {
                    reject(err) ;
                    return ;
                }
                parseString(data, { explicitArray: false }, (err: Error, result: object) => {
                    if (err) {
                        reject(err) ;
                    }
                    else {
                        this.parseQSPIFlashInfo(result) ;
                        resolve() ;
                    }
                }) ;
            }
        }) ;
        return ret ;
    }

    private parseQSPIFlashInfo(qspixml: any): void {
        let mems = qspixml.Memories.PhysicalMemories.ExternalMemory ;
        if (!Array.isArray(mems)) {
            mems = [mems] ;
        }
        for(let phys of mems) {
            let emem: PhysicalMemory = {
                description: phys.$.description,
                displayName: phys.$.displayName,
                reservationId: phys.$.reservationId,
                memoryId: phys.$.memoryId,
                size: parseInt(phys.$.size, 16),
                capabilities: [...phys.Capabilities.Capability],
            } ;
            this.externalMemories_.push(emem) ;
        }
    }

    //
    // This methods iterates through the memory views and links the views to the physical memories
    //
    private linkViewsAndMemories() {
        for(let view of this.memviews_) {
            for(let m of view.memviews) {
                let pmem = this.physicalMemories_.find( p => p.memoryId === m.memoryId ) ;
                if (pmem) {
                    m.memory = pmem ;
                }
                else {
                    let resid = m.mapId ;
                    if (m.suffix && m.suffix.length > 0 && resid.endsWith(m.suffix) === false) {
                        resid = resid.substring(0, resid.length - m.suffix.length) ;
                    }
                    let erem = this.externalMemories_.find( r => r.reservationId === resid ) ;
                    if (erem) {
                        m.memoryId = erem.memoryId ;
                        m.memory = erem ;
                    }
                }
            }
        }
    }

    private getMemoryMapFile(devdb: DeviceDBManager, device: string): string | null {
        let dirs = devdb.getDevicePaths(device, 'hobto_4.0') ;
        if (!dirs) {
            return null ;
        }

        for(let dir of dirs) {
            let f = path.join(dir, 'memories.cydata') ;
            if (fs.existsSync(f)) {
                let data = fs.readFileSync(f) ;
                let td = data.slice(0, this.dbFileTag.length) ;
                let tds = td.toString() ;
                if (tds === this.dbFileTag) {
                    data = data.slice(this.dbFileTag.length) ;
                    for(let i = 0 ; i < this.keyString.length; i++) {
                        data[i] = data[i] ^ this.keyString.charCodeAt(i) ;
                    }
                    try {
                        let xmlstr = zlib.gunzipSync(new Uint8Array(data)).toString() ;
                        return xmlstr ;
                    } catch (e) {
                        return null ;
                    }   
                }
            }
        }

        return null ;
    }    

    private extractMemoryData(xmlstr: string) : Promise<any> {
        var parseString = require('xml2js').parseString;

        let ret = new Promise<any>((resolve, reject) => {
            parseString(xmlstr, { explicitArray: false }, (err: Error, result: object) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        }) ;
        return ret ;
    }    

    private extractMemoryViews(memviews: any): boolean {
        if (memviews) {
            if (Array.isArray(memviews.MemoryView)) {
                for(let mv of memviews.MemoryView) {
                    let memview : MemoryView = {
                        viewId: mv.$.viewId,
                        memviews: []
                    } ;

                    for(let views of mv.Map) {

                        let adds: string[] = views.CapabilitiesAdd ? [views.CapabilitiesAdd.Capability] : [] ;
                        let removes: string[] = views.CapabilitiesRemove ? [views.CapabilitiesRemove.Capability] : [] ;

                        let v : View = {
                            address: parseInt(views.$.address, 16),
                            mapId: views.$.mapId,
                            memoryId: views.$.memoryId,
                            offset: parseInt(views.$.offset, 16),
                            size: parseInt(views.$.size, 16),
                            suffix: views.$.suffix,
                            capabilitiesAdd: adds,
                            capabilitiesRemove: removes
                        } ;
                        memview.memviews.push(v) ;
                    }

                    this.memviews_.push(memview) ;
                }
            }
        }

        return true ;
    }

    private extractPhysicalMemories(physmems: any): boolean {
        if (physmems) {
            for(let pm of physmems.PhysicalMemory) {
                let pmem : PhysicalMemory = {
                    description: pm.$.description,
                    displayName: pm.$.displayName,
                    memoryId: pm.$.memoryId,
                    size: parseInt(pm.$.size, 16),
                    capabilities: [...pm.Capabilities.Capability],
                };
                this.physicalMemories_.push(pmem) ;
            }

            for(let rs of physmems.ExternalReservation) {
                let rmem : ExternalReservation = {
                    reservationId: rs.$.reservationId,
                    size: parseInt(rs.$.size, 16)
                };
                this.externalReservation_.push(rmem) ;
            }
        }
        
        return true ;
    }

    private extractBusMasters(busmasters: any): boolean {
        if (busmasters) {
            for(let core of busmasters.Core) {
                let bm : BusMaster = {
                    index: core.$.index,
                    type: core.$.type,
                    viewId: core.$.viewId
                };
                this.busMasters_.push(bm) ;
            }
        }

        return true ;
    }
}