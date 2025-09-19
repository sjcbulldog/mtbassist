import { MTBAssistObject } from "../extobj/mtbassistobj";
import { MTBProjectInfo } from "../mtbenv/appdata/mtbprojinfo";
import { ModusToolboxEnvironment } from "../mtbenv";
import { MemoryUsageData, MemoryUsageSegment } from "../comms";
import * as path from 'path' ;
import * as fs from 'fs' ;
import { MemoryMap, MemoryView, View } from "./memmap";
import { GeomElement } from "../geom/geom";

class MemorySegment {
    private sections_ : string[] = [] ;
    private view_ : View[] = [] ;

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

    public get views() : View[] {
        return this.view_ ;
    }

    public set views(v: View[]) {
        this.view_ = v ;
    }
}

interface ViewMatch {
    view: View ;
    address: number ;
    type: 'virtual' | 'physical' | 'virtual/physical' ;
}

export class MemoryUsageMgr {
    private static readonly gccFeatureId = '8472a194-a4ec-4c1b-bfda-b6fca90b3f0d' ;

    private ext_ : MTBAssistObject ;
    private segments_ : Map<string, MemorySegment[]> = new Map() ;
    private gccReadElfTool_ : string | undefined = undefined ;
    private usage_ : MemoryUsageData[] = [] ;
    private memoryMapObj_? : MemoryMap ;
    private usageViewMap_: Map<MemoryUsageData, View[]> = new Map() ;
    
    constructor(mtbobj: MTBAssistObject) {
        this.ext_ = mtbobj ;
    }

    public updateMemoryInfo() : Promise<boolean> {
        let ret = new Promise<boolean>(async (resolve, reject) => {
            if (!this.ext_.deviceDB) {
                this.clear() ;
                resolve(false) ;
                return ;
            }

            let app = this.ext_.env?.appInfo ;
            if (!app) {
                this.clear() ;
                resolve(false) ;
                return ;
            }

            let tool = this.ext_!.env?.toolsDB.findToolByGUID(MemoryUsageMgr.gccFeatureId) ;
            if (!tool) {
                this.clear() ;
                resolve(false) ;
                return ;
            }

            this.gccReadElfTool_ = path.join(tool.path, 'bin', 'arm-none-eabi-readelf') ;
            if (process.platform === 'win32') {
                this.gccReadElfTool_ += '.exe' ;
            }
            if (!fs.existsSync(this.gccReadElfTool_)) {
                this.clear() ;
                resolve(false) ;    
                return ;
            }

            try {
                this.memoryMapObj_ = new MemoryMap(this.ext_.deviceDB!, this.ext_.env!) ;
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
                    this.computeMemoryUsage() ;
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

    public get usage() : MemoryUsageData[] {
        return this.usage_ ;
    }

    private findViewEntriesForSeg(view: MemoryView, s: MemorySegment)  : ViewMatch[] {
        let ret: ViewMatch[] = [] ;
        for(let v of view.memviews) {
            if (s.virtaddr >= v.address && s.virtaddr + s.memsize <= v.address + v.size) {
                if (s.physaddr === s.virtaddr) {
                    ret.push({ view: v, address: s.virtaddr, type: 'virtual/physical' }) ;
                    continue ;
                }
                ret.push({ view: v, address: s.virtaddr, type: 'virtual' }) ;
            }

            if (s.physaddr >= v.address && s.physaddr + s.memsize <= v.address + v.size) {
                ret.push({ view: v, address: s.physaddr, type: 'physical' }) ;
            }
        }

        return ret ;
    }

    // #region compute memory usage
    private computeMemoryUsage() {
        this.usage_ = [] ;

        if (this.segments_.size === 0 || this.memoryMapObj_ === undefined || !this.memoryMapObj_.isValid) {
            return ;
        }

        for(let [projname, segs] of this.segments_) {
            let proj = this.ext_.env!.appInfo!.projects.find( p => p.name === projname ) ;
            if (!proj) {
                this.ext_.logger.warn(`MemoryUsageMgr: No project found with name ${projname}`) ;
                continue ;
            }
            
            let viewname = 'view_' + proj.coreType ;
            let view = this.memoryMapObj_.memoryViewFromViewName(viewname) ;
            if (!view) {
                this.ext_.logger.warn(`MemoryUsageMgr: No memory view found for project ${projname} core ${proj.coreName}`) ;
                continue ;
            }

            //
            // We have the view for the segment we are processing, find the view assocaited with the
            // addresses in the memory segment.  The memory segment comes from running readelf on the
            // ELF file for the project.  This findViewEntryForSeg method looks at the virtual and the
            // physical addresses.
            //
            for(let s of segs) {
                let views = this.findViewEntriesForSeg(view, s) ;

                for(let v of views) {
                    if (!v.view.memory) {
                        this.ext_.logger.warn(`MemoryUsageMgr: No physical memory found for view ${v.view.memoryId} in project ${projname}`) ;
                        continue ;
                    }
                    let physmem = v.view.memory?.displayName ;

                    let usage = this.usage_.find( u => u.name === physmem ) ;
                    if (!usage) {
                        usage = {
                            name: physmem!,
                            start: 0,
                            size: v.view.size,
                            percent: 0,
                            segments: []
                        } ;
                        this.usage_.push(usage) ;
                    }

                    let seg = {
                        start: v.address,
                        size: s.memsize,
                        type: v.type,
                        sections: s.sections.map( sec => sec + ` (${s.project})` )
                    } ;

                    let mapentry = this.usageViewMap_.get(usage) ;
                    if (mapentry === undefined) {
                        mapentry = [] ;
                        this.usageViewMap_.set(usage, mapentry) ;
                    }
                    this.insertViewEntry(mapentry, v.view) ;
                    usage.segments.push(seg) ;
                }
            }
        }

        this.normalizeUsageAddresses() ;
        this.computePercentages() ;
    }

    private computeOnePercentage(u: MemoryUsageData) {
        let geom = new GeomElement() ;
        for(let seg of u.segments) {
            geom.addSegmentFromPointAndLength(seg.start, seg.size) ;
        }

        // Now the geom object has all the segments, merge them to eliminate overlaps
        geom.merge() ;

        let used = 0 ;
        for(let seg of geom.segments) {
            used += seg.length ;
        }

        u.percent = Math.round((used / u.size) * 100) ;
    }

    private computePercentages() {
        for(let u of this.usage_) {
            this.computeOnePercentage(u) ;
        }
    }

    private findPrimaryView(views: View[]) : View | undefined {
        let memname: string | undefined = undefined ;
        let view: View | undefined = undefined ;

        for(let v of views) {
            let vname = v.mapId ;
            if (v.suffix && v.suffix.length > 0 && vname.endsWith(v.suffix)) {
                vname = vname.substring(0, vname.length - v.suffix.length) ;
            }

            if (memname === undefined) {
                memname = vname ;
            }
            else if (memname !== vname) {
                return undefined ;
            }

            if (!v.suffix || v.suffix.length === 0) {
                view = v ;
            }
        }
        return view ;
    }

    private findViewFromUsageAndAddress(u: MemoryUsageData, addr: number) : View | undefined {
        let views = this.usageViewMap_.get(u) ;
        if (!views) {
            return undefined ;
        }

        for(let v of views) {
            if (addr >= v.address && addr < v.address + v.size) {
                return v ;
            }
        }

        return undefined ;
    }

    private normalizeOneUsageAddresses(u: MemoryUsageData, primary: View) {
        for(let seg of u.segments) {
            let v = this.findViewFromUsageAndAddress(u, seg.start) ;
            if (v) {
                if (v !== primary) {
                    seg.start = primary.address + (seg.start - v.address) ;
                }
            }
            else {
                this.ext_.logger.warn(`MemoryUsageMgr: Could not find view for segment starting at ${seg.start.toString(16)} in memory ${u.name}, cannot normalize address`) ;
            }
        }
    }

    private normalizeUsageAddresses() {
        for(let u of this.usage_) {
            let primary = this.findPrimaryView(this.usageViewMap_.get(u) || []) ;
            if (!primary) {
                this.ext_.logger.warn(`MemoryUsageMgr: Could not find primary view for memory ${u.name}, cannot normalize addresses`) ;
                continue ;
            }
            u.start = primary.address ;
            this.normalizeOneUsageAddresses(u, primary) ;
        }
    }

    private insertViewEntry(entries: View[], entry: View) {
        for(let e of entries) {
            if (e.address === entry.address && e.size === entry.size) {
                return ;
            }
        }

        entries.push(entry) ;
    }

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
                this.ext_.logger.warn(`MemoryUsageMgr: ELF file ${elffile} does not exist`) ;
                resolve(false) ;
                return ;
            }

            let args = [ '-l', elffile ] ;
            let options = { id: 'mtbassist.memoryusage' } ;
            ModusToolboxEnvironment.runCmdCaptureOutput(this.gccReadElfTool_!, args, options)
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