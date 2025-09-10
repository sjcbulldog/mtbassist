import { MTBAssistObject } from "../extobj/mtbassistobj";
import { DeviceMemorySegment, MemoryMap } from "./memmap";
import { MTBProjectInfo } from "../mtbenv/appdata/mtbprojinfo";
import { ModusToolboxEnvironment } from "../mtbenv";
import { MemoryUsageData, MemoryUsageSegment } from "../comms";
import * as path from 'path' ;
import * as fs from 'fs' ;

class MemorySegments {
    private sections_ : string[] = [] ;

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
}

export class MemoryUsageMgr {
    private static readonly gccFeatureId = '8472a194-a4ec-4c1b-bfda-b6fca90b3f0d' ;

    private ext_ : MTBAssistObject ;
    private deviceMemoryMap_ : DeviceMemorySegment[] = [] ;
    private segments_ : Map<string, MemorySegments[]> = new Map() ;
    private gccReadElfTool_ : string | undefined = undefined ;
    private usage_ : MemoryUsageData[] = [] ;
    
    constructor(mtbobj: MTBAssistObject) {
        this.ext_ = mtbobj ;
    }

    public updateMemoryInfo() : Promise<boolean> {
        let ret = new Promise<boolean>((resolve, reject) => {
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

            this.getSegmentsFromProjects()
            .then((result) => {
                this.deviceMemoryMap_ = MemoryMap.getMemoryMap(app!.projects[0].device) ;   
                this.computeMemoryUsage() ;
                resolve(true) ;
            })
            .catch((err) => {
                this.ext_.logger.error(`MemoryUsageMgr: Error updating memory info: ${err}`) ;
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

    private computeMemoryUsage() {
        this.usage_ = [] ;

        let memgroups: DeviceMemorySegment[][] = [] ;

        for(let mem of this.deviceMemoryMap_) {
            if (!mem.main) {
                let one : DeviceMemorySegment[] = [ mem ] ;
                for (let mem2 of this.deviceMemoryMap_) {
                    if (mem2.main && mem2.main === mem.name) {
                        one.push(mem2) ;
                    }
                }
                memgroups.push(one) ;
            }
        }

        for(let group of memgroups) {
            let mem = group[0] ;
            let segs = this.findSegmentsForMemory(group) ;
            let used = segs.reduce((acc, seg) => acc + seg.memsize, 0) ;
            let percent = (mem.size === 0) ? 0 : Math.round((used / mem.size) * 100) ;

            let segsused: MemoryUsageSegment[] = segs.map(seg => {
                return {
                    start: seg.virtaddr,
                    size: seg.memsize,
                    sections: seg.sections
                } ;
            }) ;


            let one : MemoryUsageData = {
                name: mem.name,
                start: mem.start,
                size: mem.size,
                percent: percent,
                segments: segsused
            } ;
            this.usage_.push(one) ;
        }
    }

    private segmentInGroup(seg: MemorySegments, group: DeviceMemorySegment[]) : MemoryUsageSegment | undefined {
        for(let mem of group) {
            if (seg.virtaddr >= mem.start && seg.virtaddr + seg.memsize < mem.start + mem.size) {
                let offset = 0 ;
                if (mem.main) {
                    offset = mem.start - group[0].start ;
                }

                return {
                    start: seg.virtaddr - offset,
                    size: seg.memsize,
                    sections: seg.sections
                } ;
            }

            if (seg.physaddr >= mem.start && seg.physaddr + seg.memsize < mem.start + mem.size) {
                let offset = 0 ;
                if (mem.main) {
                    offset = mem.start - group[0].start ;
                }

                return {
                    start: seg.virtaddr - offset,
                    size: seg.memsize,
                    sections: seg.sections
                } ;
            }
        }

        return undefined ;
    }

    private findSegmentsForMemory(group: DeviceMemorySegment[]) : MemorySegments[] {
        let ret: MemorySegments[] = [] ;
        for(let [projname, segs] of this.segments_) {
            for(let seg of segs) {
                if (this.segmentInGroup(seg, group)) {
                    ret.push(seg) ;
                }
            }
        }
        return ret ;
    }

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
            let elffile = path.join(this.ext_.env!.appInfo!.appdir, 'build', 'project_hex', proj.name) + '.elf' ;
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

            let seg = new MemorySegments(projname, offset, virtaddr, physaddr, filesize, memsize, flags) ;
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
}