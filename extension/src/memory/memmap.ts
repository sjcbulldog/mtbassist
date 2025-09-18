import { DeviceDBManager } from "../devdb/devdbmgr";
import * as path from 'path' ;
import * as fs from 'fs' ;
import * as zlib from 'zlib' ;

//
// TODO: need to rework this now that I understand the XML file better.
//

export interface DeviceMemorySegment {
    proc: string ;
    start: number;
    size: number;
    name: string;
    description?: string;
    main?: string ;
}

export class BusMaster {

}

export class PhysicalMemory {

}

export class ReferencedMemory {

}

export class MemoryView {

}

export class MemoryMap {
    private static readonly dbFileTag = 'PSOCCREATORDATAFILE' ;
    private static readonly keyString = 'Cypress' ;

    private static memviews: MemoryView[] = [] ;
    private static physicalMemories: PhysicalMemory[] = [] ;
    private static referencedMemory: ReferencedMemory[] = [] ;
    private static busMasters: BusMaster[] = [] ;

    static getMemoryMap(devdb: DeviceDBManager, device: string): Promise<DeviceMemorySegment[] | null> {
        let ret = new Promise<DeviceMemorySegment[] | null>( (resolve, reject) => {
            let xmlstr = MemoryMap.getMemoryMapFile(devdb, device) ;
            if (xmlstr === null) {
                return null ;
            }

            MemoryMap.extractMemoryData(xmlstr)
            .then((memdata) => {
                if (!memdata || !memdata.Memories || !memdata.Memories.MemoryViews || !memdata.Memories.MemoryViews.MemoryView ||
                            !memdata.Memories.PhysicalMemories || !memdata.Memories.PhysicalMemories.PhysicalMemory ) {
                    resolve(null) ;
                    return ;
                }

                let physical = MemoryMap.extractPhysicalMemories(memdata.Memories.PhysicalMemories.PhysicalMemory) ;
                if (!physical || physical.length === 0) {
                    resolve(null) ;
                    return ;
                }

                if (memdata.Memories.PhysicalMemories.ExternalReservation) {
                    let exts = MemoryMap.extractExternalMemories(memdata.Memories.PhysicalMemories.ExternalReservation) ;
                    physical = physical.concat(exts) ;
                }

                let memories = MemoryMap.extractMemories(memdata.Memories.MemoryViews.MemoryView) ;
                if (!memories) {
                    resolve(null) ;
                    return ;
                }
                memories = MemoryMap.groupMemories(physical, memories) ;
                resolve(memories) ;
            })
            .catch((err) => {  
                reject(err) ;
            }) ;
        }) ;
        return ret ;
    }

    private static mapName(name: string): string {
        let ret = name ;
        if (name === 'CM55_DTCM_INTERNAL') {
            ret = 'CM55_DTCM' ;
        }
        else if (name === 'CM55_ITCM_INTERNAL') {
            ret = 'CM55_ITCM' ;
        }

        return ret ;
    }

    private static fixMemoryNames(memories: DeviceMemorySegment[]): void {
        for(let m of memories) {
            m.name = MemoryMap.mapName(m.name) ;
        }
    }

    private static groupMemories(physical: Array<[string, string]>, memories: DeviceMemorySegment[]): DeviceMemorySegment[] {
        let mems = MemoryMap.consolidateMemories(memories) ;

        for(let m of physical) {
            let existing = mems.find( (em) => { return (em.name === m[0]) ; } ) ;
            if (existing) {
                for(let alt of mems) {
                    if (alt.name.startsWith(m[0]) && alt.name.length > m.length) {
                        alt.main = m[0] ;
                    }
                }
            }
        }
        
        return mems ;
    }

    private static consolidateMemories(memories: DeviceMemorySegment[]): DeviceMemorySegment[] {
        let ret: DeviceMemorySegment[] = [] ;

        for(let m of memories) {
            let existing = ret.find( (em) => { return (em.name === m.name) ; } ) ;
            if (!existing) {
                ret.push(m) ;
            }
        }

        return ret;
    }

    private static extractMemories(memviews: any): DeviceMemorySegment[] | null {
        let segments: DeviceMemorySegment[] = [] ;

        for(let mv of memviews) {
            let proc = mv.$.viewId ;
            let segs = MemoryMap.extraceOneMemView(proc, mv) ;
            if (segs) {
                segments = segments.concat(segs) ;
            }
        }

        return segments ;
    }

    private static extraceOneMemView(proc: string, memview: any): DeviceMemorySegment[] {
        let segments: DeviceMemorySegment[] = [] ;
        
        for(let mr of memview.Map) {
            let seg = MemoryMap.extractOneMemSegment(proc, mr) ;
            if (seg) {
                segments.push(seg) ;
            }
        }

        return segments ;
    }

    private static extractOneMemSegment(proc: string, seg: any) : DeviceMemorySegment | null {
        let dms: DeviceMemorySegment | null = null ;
        let props = seg.$ ;
        if (props) {
            dms = {
                name: props.mapId,
                start: parseInt(props.address, 16),
                size: parseInt(props.size, 16),
                proc: proc
            };
        }
        return dms ;
    }

    private static extractMemoryData(xmlstr: string) : Promise<any> {
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

    private static extractExternalMemories(extmems: any): Array<[string, string]> {
        let ret: Array<[string, string]> = [] ;
        for(let em of extmems) {
            if (em.$ && em.$.reservationId) {
                ret.push(em.$.reservationId, em.$.reservationId) ;
            }
        }

        return ret ;
    }

    private static extractPhysicalMemories(physmems: any): Array<[string, string]> {
        let ret: Array<[string, string]> = [] ;
        for(let pm of physmems) {
            if (pm.$ && pm.$.memoryId && pm.$.displayName) {
                ret.push(pm.$.memoryId, pm.$.displayName) ;
            }
        }

        return ret ;
    }

    private static getMemoryMapFile(devdb: DeviceDBManager, device: string): string | null {
        let dirs = devdb.getDevicePaths(device, 'hobto_4.0') ;
        if (!dirs) {
            return null ;
        }

        for(let dir of dirs) {
            let f = path.join(dir, 'memories.cydata') ;
            if (fs.existsSync(f)) {
                let data = fs.readFileSync(f) ;
                let td = data.slice(0, MemoryMap.dbFileTag.length) ;
                let tds = td.toString() ;
                if (tds === MemoryMap.dbFileTag) {
                    data = data.slice(MemoryMap.dbFileTag.length) ;
                    for(let i = 0 ; i < MemoryMap.keyString.length; i++) {
                        data[i] = data[i] ^ MemoryMap.keyString.charCodeAt(i) ;
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
}