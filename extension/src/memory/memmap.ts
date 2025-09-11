import { DeviceDBManager } from "../devdb/devdbmgr";
import * as path from 'path' ;
import * as fs from 'fs' ;
import * as zlib from 'zlib' ;

export interface DeviceMemorySegment {
    proc: string ;
    start: number;
    size: number;
    name: string;
    description?: string;
    main?: string ;
}

// const explorerMemoryMap: DeviceMemorySegment[] = [
//     { proc: 'cm55', start: 0x00000000, size: 0x00040000, name: 'itcm', description: 'Instruction Tightly Coupled Memory'},
//     { proc: 'cm33', start: 0x48000000, size: 0x00040000, name: 'itcm-m33-ns', description: 'Instruction Tightly Coupled Memory', main: 'itcm' },
//     { proc: 'cm33', start: 0x58000000, size: 0x00040000, name: 'itcm-m33-s', description: 'Instruction Tightly Coupled Memory', main: 'itcm' },

//     { proc: '*',    start: 0x20000000, size: 0x00040000, name: 'dtcm', description: 'Data Tightly Coupled Memory' },
//     { proc: 'cm33', start: 0x48040000, size: 0x00040000, name: 'dtcm-m33-ns', description: 'Data Tightly Coupled Memory', main: 'dtcm' },
//     { proc: 'cm33', start: 0x58040000, size: 0x00040000, name: 'dtcm-m33-s', description: 'Data Tightly Coupled Memory', main: 'dtcm' },

//     { proc: 'cm33', start: 0x02000000, size: 0x02000000, name: 'rram-ns-c', description: 'RRAM non-volatile memory', main: 'rram' },
//     { proc: 'cm33', start: 0x12000000, size: 0x02000000, name: 'rram-s-c', description: 'RRAM non-volatile memory', main: 'rram' },
//     { proc: '*',    start: 0x22000000, size: 0x02000000, name: 'rram', description: 'RRAM non-volatile memory'},
//     { proc: 'cm33', start: 0x32000000, size: 0x02000000, name: 'rram-s-s', description: 'RRAM non-volatile memory', main: 'rram' },

//     { proc: 'cm33', start: 0x06000000, size: 0x00500000, name: 'socmem-ns-c', description: 'Shared System RAM', main: 'socmem' },
//     { proc: 'cm33', start: 0x16000000, size: 0x00500000, name: 'socmem-s-c', description: 'Shared System RAM', main: 'socmem' },
//     { proc: '*',    start: 0x26000000, size: 0x00500000, name: 'socmem', description: 'Shared System RAM'},
//     { proc: 'cm33', start: 0x36000000, size: 0x00500000, name: 'socmem-s-s', description: 'Shared System RAM', main: 'socmem' },

//     { proc: '*', start: 0x04000000, size: 0x00080000, name: 'sram-ns-c', description: 'Cortex-M33 System SRAM', main: 'sram' },    
//     { proc: '*', start: 0x14000000, size: 0x00080000, name: 'sram-s-c', description: 'Cortex-M33 System SRAM', main: 'sram' },   
//     { proc: '*', start: 0x24000000, size: 0x00080000, name: 'sram', description: 'Cortex-M33 System SRAM' },       
//     { proc: '*', start: 0x34000000, size: 0x00080000, name: 'sram-s-s', description: 'Cortex-M33 System SRAM', main: 'sram' },   

//     { proc: '*', start: 0x08000000, size: 0x04000000, name: 'xip-0-ns-c', description: 'SMIF-0 connected external memory', main: 'xip-0' },
//     { proc: '*', start: 0x18000000, size: 0x04000000, name: 'xip-0-s-c', description: 'SMIF-0 connected external memory', main: 'xip-0' },
//     { proc: '*', start: 0x28000000, size: 0x04000000, name: 'xip-0', description: 'SMIF-0 connected external memory' },
//     { proc: '*', start: 0x38000000, size: 0x04000000, name: 'xip-0-s-s', description: 'SMIF-0 connected external memory', main: 'xip-0' },

//     { proc: '*', start: 0x0c000000, size: 0x04000000, name: 'xip-1-ns-c', description: 'SMIF-1 connected external memory', main: 'xip-1' },
//     { proc: '*', start: 0x1c000000, size: 0x04000000, name: 'xip-1-s-c', description: 'SMIF-1 connected external memory', main: 'xip-1' },
//     { proc: '*', start: 0x2c000000, size: 0x04000000, name: 'xip-1', description: 'SMIF-1 connected external memory' },
//     { proc: '*', start: 0x3c000000, size: 0x04000000, name: 'xip-1-s-s', description: 'SMIF-1 connected external memory', main: 'xip-1' },
// ] ;

export class MemoryMap {
    private static readonly dbFileTag = 'PSOCCREATORDATAFILE' ;
    private static readonly keyString = 'Cypress' ;

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

                for(let i = 0 ; i < physical.length; i++) {
                    physical[i] = MemoryMap.mapName(physical[i]) ;
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

    private static groupMemories(physical: string[], memories: DeviceMemorySegment[]): DeviceMemorySegment[] {

        MemoryMap.fixMemoryNames(memories) ;
        let mems = MemoryMap.consolidateMemories(memories) ;

        for(let m of physical) {
            let existing = mems.find( (em) => { return (em.name === m) ; } ) ;
            if (existing) {
                for(let alt of mems) {
                    if (alt.name.startsWith(m) && alt.name.length > m.length) {
                        alt.main = m ;
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

    private static extractExternalMemories(extmems: any): string[] {
        let ret: string[] = [] ;
        for(let em of extmems) {
            if (em.$ && em.$.reservationId) {
                ret.push(em.$.reservationId) ;
            }
        }

        return ret ;
    }

    private static extractPhysicalMemories(physmems: any): string[] {
        let ret: string[] = [] ;
        for(let pm of physmems) {
            if (pm.$ && pm.$.memoryId) {
                ret.push(pm.$.memoryId) ;
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