import { MTBAssistObject } from "../extobj/mtbassistobj";
import { MTBProjectInfo } from "../mtbenv/appdata/mtbprojinfo";
import { ModusToolboxEnvironment } from "../mtbenv";
import { MemoryRegion, MemoryUsageSegment, PhysicalMemoryUsageData } from "../comms";
import * as path from 'path' ;
import * as fs from 'fs' ;
import { MemoryMap, DeviceMemoryView, View, PhysicalMemory } from "./memmap";
import { GeomElement } from "../geom/geom";
import { assert } from "console";
import { DesignModus } from "./dmodus";

class MemorySegment {
    private sections_ : string[] = [] ;
    private view_ : ViewMatch[] = [] ;
    private physoffset: number = 0 ;
    private virtoffset: number = 0 ;

    constructor(
        public project: string,
        public offset: number,
        public virtaddr: number,
        public physaddr: number,
        public filesize: number,
        public memsize: number,
        public flags: string) {
    }

    public get sections() : string[] {
        return this.sections_ ;
    }

    public addSection(sec: string) {
        this.sections_.push(sec) ;
    }

    public get views() : ViewMatch[] {
        return this.view_ ;
    }

    public set views(v: ViewMatch[]) {
        this.view_ = v ;
    }

    public get physOffset() : number {
        return this.physoffset ;
    }

    public set physOffset(o: number) {
        this.physoffset = o ;
    }

    public get virtOffset() : number {
        return this.virtoffset ;
    }

    public set virtOffset(o: number) {
        this.virtoffset = o ;
    }
}

type ViewMatchType = 'virtual' | 'physical' | 'virtual/physical' ;

interface ViewMatch {
    view: View ;
    type: ViewMatchType ;
}

export class MemoryUsageMgr {
    private static readonly gccFeatureId = '8472a194-a4ec-4c1b-bfda-b6fca90b3f0d' ;

    private ext_ : MTBAssistObject ;
    private segments_ : Map<string, MemorySegment[]> = new Map() ;
    private gccReadElfTool_ : string | undefined = undefined ;
    private usage_ : PhysicalMemoryUsageData[] = [] ;
    private memoryMapObj_? : MemoryMap ;
    private dmodus_ : DesignModus | undefined = undefined ;
    
    constructor(mtbobj: MTBAssistObject) {
        this.ext_ = mtbobj ;
    }

    public hasSupport() : boolean {
        if (!this.memoryMapObj_) {
            return false ;
        }
        return this.memoryMapObj_.hasSupport ;
    }

    public updateMemoryInfo() : Promise<boolean> {
        let ret = new Promise<boolean>(async (resolve, reject) => {
            if (!this.ext_.deviceDB || !this.ext_.env) {
                this.clear() ;
                resolve(false) ;
                return ;
            }

            let app = this.ext_.env.appInfo ;
            if (!app) {
                this.clear() ;
                resolve(false) ;
                return ;
            }

            this.gccReadElfTool_ = this.ext_!.env?.toolsDB.findToolProgramPath(MemoryUsageMgr.gccFeatureId, 'bin', 'arm-none-eabi-readelf') ;
            if (!this.gccReadElfTool_) {
                this.clear() ;
                resolve(false) ;
                return ;
            }

            try {
                this.memoryMapObj_ = new MemoryMap(this.ext_.deviceDB, this.ext_.env) ;
                await this.memoryMapObj_.getMemoryMap() ;
            }
            catch (err) {
                this.ext_.logger.error(`MemoryUsageMgr: Error getting memory map: ${err}`) ;
                this.clear() ;
                resolve(false) ;
                return ;
            }

            this.segments_.clear() ;
            this.getSegmentsFromProjects()
            .then((result) => {
                if (result) {
                    this.loadDeignModusFile()
                    .then( () => {
                        this.computeMemoryUsage() ;
                        resolve(true) ;
                    })
                    .catch( (err) => {
                        this.ext_.logger.error(`MemoryUsageMgr: Error loading design.modus file: ${err}`) ;
                        this.clear() ;
                        resolve(false) ;
                    }) ;
                }
                else {
                    this.clear() ;
                    resolve(false) ;
                }
            })
            .catch((err) => {
                this.ext_.logger.error(`MemoryUsageMgr: Error getting memory map: ${err}`) ;
                this.clear() ;
                resolve(false) ;
            }) ;
        }) ;
        
        return ret ;
    }

    public clear() {
        this.usage_ = [] ;
        this.segments_.clear() ;
    }

    public get usage() : PhysicalMemoryUsageData[] | null {
        if (!this.hasSupport()) {
            return null ;
        }
        return this.usage_ ;
    }

    private loadDeignModusFile() : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let filename = path.join(this.ext_.env!.appInfo!.bspdir, 'TARGET_' + this.ext_.env!.appInfo!.projects[0].target, 'config', 'design.modus') ;
            this.dmodus_ = new DesignModus(filename) ;
            this.dmodus_.init()
            .then( () => {
                resolve() ;
            })
            .catch( (err) => {
                this.ext_.logger.error(`MemoryUsageMgr: Error loading design.modus file: ${err}`) ;
                resolve() ;
            }) ;
        }) ;
    }

    private findViewEntriesForSeg(view: DeviceMemoryView, s: MemorySegment)  : ViewMatch[] {
        let ret: ViewMatch[] = [] ;
        for(let v of view.memviews) {
            if (s.virtaddr >= v.address && s.virtaddr + s.memsize <= v.address + v.size) {
                if (s.physaddr === s.virtaddr) {
                    ret.push({ view: v, type: 'virtual/physical' }) ;
                    s.physOffset = s.physaddr - v.address ;
                    s.virtOffset = s.virtaddr - v.address ;
                    continue ;
                }

                ret.push({ view: v, type: 'virtual' }) ;
                s.virtOffset = s.virtaddr - v.address ;
            }

            if (s.physaddr >= v.address && s.physaddr + s.memsize <= v.address + v.size) {
                ret.push({ view: v, type: 'physical' }) ;
                s.physOffset = s.physaddr - v.address ;
            }
        }

        return ret ;
    }

    private getViewMatchAddress(s: MemorySegment, vmatch: ViewMatch) : number {
        let ret: number ;

        if (vmatch.type === 'virtual') {
            ret = s.virtaddr ;
        }
        else if (vmatch.type === 'physical') {
            ret = s.physaddr ;
        }
        else {
            assert(vmatch.type === 'virtual/physical') ;
            assert(s.virtaddr === s.physaddr) ;
            ret = s.physaddr ;
        }
        return ret ;
    }

    private mapProjectSegmentsToViews(project: string, segs: MemorySegment[]) : boolean {
        if (this.memoryMapObj_ === undefined) {
            throw new Error('MemoryUsageMgr: assert: memory map object is undefined') ;
        }

        let proj = this.ext_.env!.appInfo!.projects.find( p => p.name === project ) ;
        if (!proj) {
            this.ext_.logger.warn(`MemoryUsageMgr: No project found with name ${project}`) ;
            return false ;
        }

        // Get the view name, this is a big of a hack, we assume the view name is 'view_' + core type
        let viewname = 'view_' + proj.coreType ;
        let view = this.memoryMapObj_.memoryViewFromViewName(viewname) ;
        if (!view) {
            this.ext_.logger.warn(`MemoryUsageMgr: No memory view found for project ${project} core ${proj.coreName}`) ;
            return false;
        }

        for(let s of segs) {
            // Map the memory regions from this segment to views from the memory map
            s.views = this.findViewEntriesForSeg(view, s) ;
        }

        return true ;
    }

    // #region compute memory usage
    private computeMemoryUsage() {
        this.usage_ = [] ;

        if (this.segments_.size === 0 || this.memoryMapObj_ === undefined || !this.memoryMapObj_.isValid) {
            return ;
        }

        for(let [project, segs] of this.segments_) {
            if (!this.mapProjectSegmentsToViews(project, segs)) {
                return ;
            }
        }

        for(let physical of this.memoryMapObj_.physicalMemories) {
            let usageData: PhysicalMemoryUsageData = {
                name: physical.displayName,
                id: physical.memoryId,
                size: physical.size,
                percent: 0,
                regions: [],
            } ;
            this.usage_.push(usageData) ;
            this.addRegionsToPhysical(usageData, physical) ;
        }

        this.computePercentages() ;
    }

    private addRegionsToPhysical(usageData: PhysicalMemoryUsageData, physical: PhysicalMemory) {
        if (this.dmodus_ === undefined) {
            return ;
        }

        for(let region of this.dmodus_.getRegions()) {
            if (region.memoryId === physical.memoryId) {
                let mregion: MemoryRegion = {
                    name: region.description,
                    offset: region.offset,
                    percent: 0,
                    size: region.size,
                    memoryId: region.memoryId,
                    segments: []
                };
                usageData.regions.push(mregion);
                this.addSegmentsToRegion(usageData, mregion) ;
            }
        }
    }

    private addSegmentsToRegion(usageView: PhysicalMemoryUsageData, mregion: MemoryRegion) {
        for(let segs of this.segments_.values()) {
            for(let s of segs) {
                for(let vmatch of s.views) {
                    if (vmatch.view.memoryId === mregion.memoryId) {
                        //
                        // We are in the right memory, now see if the segment offset matches the region offset
                        //
                        if (s.physOffset >= mregion.offset && s.physOffset < mregion.offset + mregion.size && vmatch.type === 'virtual/physical') {
                            // The virtual and physical addresses are the same and are in the region
                            let seg: MemoryUsageSegment = {
                                start: s.physaddr,
                                msize: s.memsize,
                                fsize: s.filesize,
                                type: vmatch.type
                            } ;
                            mregion.segments.push(seg) ;                            
                        }
                        else if (s.physOffset >= mregion.offset && s.physOffset < mregion.offset + mregion.size && vmatch.type === 'physical') {
                            // The physical address is in the region
                            let seg: MemoryUsageSegment = {
                                start: s.physaddr,
                                msize: s.memsize,
                                fsize: s.filesize,
                                type: vmatch.type
                            } ;
                            mregion.segments.push(seg) ;
                        }
                        else if (s.virtOffset >= mregion.offset && s.virtOffset < mregion.offset + mregion.size && vmatch.type === 'virtual') {
                            // The virtual address is in the region
                            let seg: MemoryUsageSegment = {
                                start: s.virtaddr,
                                msize: s.memsize,
                                fsize: s.filesize,
                                type: vmatch.type
                            } ;
                            mregion.segments.push(seg) ;                            
                        }
                    }
                }
            }
        }
    }

    private computePercentages() {
        for(let u of this.usage_) {
            let memGeom = new GeomElement() ;
            for(let r of u.regions) {
                let geom = new GeomElement() ;
                for(let seg of r.segments) {
                    let size : number ;
                    if (seg.type === 'physical') {
                        size = seg.fsize ;
                    }
                    else {
                        size = Math.max(seg.fsize, seg.msize) ;
                    }
                    geom.addSegmentFromPointAndLength(seg.start, size) ;
                }

                // Now the geom object has all the segments, merge them to eliminate overlaps
                geom.merge() ;

                let used = 0 ;
                for(let seg of geom.segments) {
                    used += seg.length ;
                }

                r.percent = (used / r.size) * 100 ;

                memGeom.addSegmentFromPointAndLength(r.offset, r.size) ;
            }

            // Now compute the overall memory usage
            memGeom.merge() ;
            let used = 0 ;
            for(let seg of memGeom.segments) {
                used += seg.length ;
            }

            u.percent = (used / u.size) * 100 ;
        }
    }

    // private computeOnePercentage(u: PhysicalMemoryUsageData) {
    //     let geom = new GeomElement() ;
    //     for(let seg of u.segments) {
    //         if (seg.type === 'physical') {
    //             geom.addSegmentFromPointAndLength(seg.start, seg.fsize) ;
    //         }
    //         else {
    //             geom.addSegmentFromPointAndLength(seg.start, seg.size) ;
    //         }
    //     }

    //     // Now the geom object has all the segments, merge them to eliminate overlaps
    //     geom.merge() ;

    //     let used = 0 ;
    //     for(let seg of geom.segments) {
    //         used += seg.length ;
    //     }

    //     u.percent = (used / u.size) * 100 ;
    // }

    // private computePercentages() {
    //     for(let u of this.usage_) {
    //         u.segments.sort( (a, b) => a.start - b.start ) ;
    //         this.computeOnePercentage(u) ;
    //     }
    // }

    // private findViewFromUsageAndAddress(u: PhysicalMemoryUsageData, addr: number) : View | undefined {
    //     let views = this.usageViewMap_.get(u) ;
    //     if (!views) {
    //         return undefined ;
    //     }

    //     for(let v of views) {
    //         if (addr >= v.address && addr < v.address + v.size) {
    //             return v ;
    //         }
    //     }

    //     return undefined ;
    // }

    // private normalizeOneUsageAddresses(u: PhysicalMemoryUsageData, primary: View) {
    //     for(let seg of u.segments) {
    //         let v = this.findViewFromUsageAndAddress(u, seg.start) ;
    //         if (v) {
    //             if (v !== primary) {
    //                 seg.start = primary.address + (seg.start - v.address) ;
    //             }
    //         }
    //         else {
    //             this.ext_.logger.warn(`MemoryUsageMgr: Could not find view for segment starting at ${seg.start.toString(16)} in memory ${u.name}, cannot normalize address`) ;
    //         }
    //     }
    // }

    // private normalizeUsageAddresses() {
    //     for(let u of this.usage_) {
    //         let primary = this.memoryMapObj_?.getViewForName(u.name) ;
    //         if (!primary) {
    //             this.ext_.logger.warn(`MemoryUsageMgr: Could not find primary view for memory ${u.name}, cannot normalize addresses`) ;
    //             continue ;
    //         }
    //         u.start = primary.address ;
    //         this.normalizeOneUsageAddresses(u, primary) ;
    //     }
    // }

    // private insertViewEntry(entries: View[], entry: View) {
    //     for(let e of entries) {
    //         if (e.address === entry.address && e.size === entry.size) {
    //             return ;
    //         }
    //     }

    //     entries.push(entry) ;
    // }

    // #endregion

    // #region getting data form readelf about memory segments and sections
    private getSegmentsFromProjects() : Promise<boolean> {
        let ret = new Promise<boolean>((resolve, reject) => {
            let promises: Promise<boolean>[] = [] ;            
            for(let proj of this.ext_.env!.appInfo!.projects) {
                promises.push(this.getMemorySegmentsFromOneProject(proj)) ;
            }

            Promise.all(promises)
            .then((results) => {
                let allOk = true ;
                for(let res of results) {
                    if (!res) {
                        allOk = false ;
                        break ;
                    }
                }
                resolve(allOk) ;
            })
            .catch((err) => {
                this.ext_.logger.error(`MemoryUsageMgr: Error getting memory segments from projects: ${err}`) ;
                resolve(false) ;
            }) ;
        }) ;

        return ret ;
    }

    private getMemorySegmentsFromOneProject(proj: MTBProjectInfo) : Promise<boolean> {
        let ret = new Promise<boolean>((resolve, reject) => {
            let elffile = path.join(proj.path, 'build', 'last_config', proj.name + '.elf') ;
            if (!fs.existsSync(elffile)) {
                this.ext_.logger.info(`MemoryUsageMgr: ELF file ${elffile} does not exist - skipping memory usage analysis`) ;
                resolve(false) ;
                return ;
            }

            let args = [ '-l', elffile ] ;
            let options = { id: 'mtbassist.memoryusage' } ;
            ModusToolboxEnvironment.runCmdCaptureOutput(this.ext_.logger, this.gccReadElfTool_!, args, options)
            .then((result) => { 
                if (result[0] !== 0) {
                    this.ext_.logger.error(`MemoryUsageMgr: ${this.gccReadElfTool_} exited with code ${result[0]}`) ;
                    resolve(false) ;
                } else {
                    let b = this.parseSegments(proj.name, result[1]) ;
                    b && this.parseSections(proj.name, result[1]) ;
                    resolve(b) ;
                }
            })
            .catch((err) => {
                this.ext_.logger.error(`MemoryUsageMgr: Error running ${this.gccReadElfTool_}: ${err}`) ;
                resolve(false) ;
            }) ;
        }) ;

        return ret ;
    }

    private parseOneLine(line: string) : string[] | undefined {
        let tokens: string[] = [] ;
        let match = line.split(/ +/) ;
        if (match.length !== 8 && match.length !== 9) {
            return undefined ;
        }

        if (match.length === 9) {
            tokens = [match[0], match[1], match[2], match[3], match[4], match[5], match[6] + match[7], match[8]] ;
        }
        else {
            tokens = [...match] ;
        }

        if (tokens[0] !== 'LOAD') {
            return undefined ;
        }

        let addr = parseInt(tokens[2], 16) ;
        if (isNaN(addr)) {
            return undefined ;
        }
        return tokens ;
    }

    private createMemorySegmentFromParts(projname: string, parts: string[]) {
        if (parts[0] === 'LOAD') {
            let offset = parseInt(parts[1], 16) ;
            let virtaddr = parseInt(parts[2], 16) ;
            let physaddr = parseInt(parts[3], 16) ;
            let filesize = parseInt(parts[4], 16) ;
            let memsize = parseInt(parts[5], 16) ;
            let flags = parts[6] ;

            if (isNaN(offset) || isNaN(virtaddr) || isNaN(physaddr) || isNaN(filesize) || isNaN(memsize)) {
                return ;
            }

            let seg = new MemorySegment(projname, offset, virtaddr, physaddr, filesize, memsize, flags) ;
            if (!this.segments_.has(projname)) {
                this.segments_.set(projname, []);
            }
            this.segments_.get(projname)!.push(seg);
        }
    }

    private addSectionsToSegment(name: string, num: number, sections: string[]) {
        let segs = this.segments_.get(name) ;
        if (!segs) {
            return ;
        }

        let one = segs[num] ;
        if (one) {
            for(let sec of sections) {
                sec = sec.trim() ;
                if (sec.length !== 0) {
                    one.addSection(sec) ;
                }
            }
        }
    }

    private parseSections(name: string, lines: string[]) : boolean {
        let index = 0 ;
        while (index < lines.length) {
            let line = lines[index++] ;
            if (line.indexOf('Section to Segment mapping') !== -1) {
                break ;
            }            
        }

        if (index < lines.length) {
            index++ ;
            while (index < lines.length) {
                let tokens = lines[index++].split(/ +/) ;
                if (tokens[0].trim().length === 0) {
                    tokens.shift() ;
                }

                if (tokens.length > 1) {
                    let num = parseInt(tokens[0]) ;
                    if (!isNaN(num)) {
                        this.addSectionsToSegment(name, num - 1, tokens.slice(1, tokens.length)) ;
                    }
                }
            }
        }

        return true ;
    }
    
    private parseSegments(name: string, lines: string[]) : boolean {
        for(let line of lines) {
            line = line.trim() ;
            if (line.length === 0) {
                continue ;
            }

            let parts = this.parseOneLine(line) ;
            if (parts === undefined) {
                continue ;
            }

            this.createMemorySegmentFromParts(name, parts) ;
        }
        return true ;
    }

    // #endregion
}