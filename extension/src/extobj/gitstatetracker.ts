import { send } from "process";
import { CreateProjectGitState, ProjectGitStateTrackerData } from "../comms";
import * as path from 'path' ;

export class ProjectGitStateTracker {
    private static readonly startGitRegex = /Git#([0-9]+)>Starting: git -C ([^ ]+)(.*)/ ;
    private static readonly progressRemoteGitRegex = /Git#([0-9]+)>remote: (.*): *([0-9]+)% *\(([0-9]+)\/([0-9]+)\)(.*)/ ;
    private static readonly progressLocalGitRegex = /Git#([0-9]+)>(.*): *([0-9]+)% *\(([0-9]+)\/([0-9]+)\)(.*)/ ;
    private static readonly endGitRegex =  /Git#([0-9]+)>Success: git -C ([^ ]+)(.*)/ ;
    private static readonly releaseRegex = /^release-v[0-9]+\.[0-9]+\.[0-9]+/ ;

    private states_: Map<string, CreateProjectGitState> = new Map() ;

    constructor() {
        console.log('FLAG: Created ProjectGitStateTracker') ;
    }

    public get data(): ProjectGitStateTrackerData {
        return [...this.states_.values()] ;
    }
    
    public processLine(line: string) : boolean {
        let sendState = false ;
        let m = ProjectGitStateTracker.startGitRegex.exec(line) ;
        if (m && m.length > 1) {
            let words = m[3].split(' ') ;
            if (words.length > 0) {
                let target = this.findTarget(m[2], words[words.length - 1]) ;
                this.start(+m[1], target) ;
                sendState = true ;
            }
        }

        m = ProjectGitStateTracker.progressRemoteGitRegex.exec(line) ;
        if (m && m.length > 1) {
            this.progress(+m[1], m[2], +m[3]) ;
            sendState = true ;  
        }

        m = ProjectGitStateTracker.progressLocalGitRegex.exec(line) ;
        if (m && m.length > 2 && !m[2].startsWith('remote:')) {
            this.progress(+m[1], m[2], +m[3]) ;
            sendState = true ;  
        }

        m = ProjectGitStateTracker.endGitRegex.exec(line) ;
        if (m && m.length > 1) {
            let words = m[3].split(' ') ;
            if (words.length > 0) {
                let target = this.findTarget(m[2], words[words.length - 1]) ;
                this.done(+m[1], target) ;
                sendState = true ;
            }
        }
     
        return sendState ;
    }

    private findTarget(first: string, last: string) : string {
        let ret: string = last ;
        if (ProjectGitStateTracker.releaseRegex.exec(last)) {
            ret = path.basename(first) ;
            if (ProjectGitStateTracker.releaseRegex.exec(ret)) {
                ret = path.basename(path.dirname(first)) ;
            }
        }
        return ret;
    }

    private start(id: number, target: string) {
        if (!this.states_.has(target)) {
            this.states_.set(target, { id: id, target: target, percent: 0, done: false, operation: 'Starting' }) ;
        }
        else {
            let entry = this.states_.get(target) ;
            if (entry) {
                entry.id = id ;
                entry.percent = 0 ;
                entry.done = false ;
                entry.operation = 'Starting' ;
            }
        }
    }

    private progress(id: number, oper:string, percent: number) {
        let entry = this.findEntryById(id) ;
        if (entry) {
            entry.operation = oper ;
            entry.percent = percent ;
        }
    }

    private done(id: number, target: string) {
        this.states_.delete(target) ;
    }

    private findEntryById(id: number) : CreateProjectGitState | undefined {
        for(let s of this.states_.values()) {
            if (s.id === id) {
                return s ;
            }
        }
        return undefined ;
    }
}
