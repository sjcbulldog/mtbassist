import { send } from "process";
import { CreateProjectGitState, ProjectGitStateTrackerData } from "../comms";
import * as path from 'path' ;

export class ProjectGitStateTracker {
    private static readonly startGitRegex = /Git#([0-9]+)>Starting: git -C (.*)/ ;
    private static readonly progressRemoteGitRegex = /Git#([0-9])+>remote: (.*): *([0-9]+)% *\(([0-9]+)\/([0-9]+)\)(.*)/ ;
    private static readonly progressLocalGitRegex = /Git#([0-9])+>(.*): *([0-9]+)% *\(([0-9]+)\/([0-9]+)\)(.*)/ ;    
    private static readonly releaseRegex = /^release-v[0-9]+\.[0-9]+\.[0-9]+/ ;

    private states_: Map<number, CreateProjectGitState> = new Map() ;

    constructor() {
    }

    public get data(): ProjectGitStateTrackerData {
        return [...this.states_.values()] ;
    }
    
    public processLine(line: string) : boolean {
        let sendState = false ;
        let m = ProjectGitStateTracker.startGitRegex.exec(line) ;
        if (m && m.length > 1) {
            let words = m[2].split(' ') ;
            if (words.length > 0) {
                let target = this.findTarget(words[0], words[words.length - 1]) ;
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
            if (m[6].indexOf('done') >= 0) {
                if (m[2] === 'Resolving deltas') {
                    this.done(+m[1]) ;
                }
            }
            else {
                this.progress(+m[1], m[2], +m[3]) ;
            }
            sendState = true ;  
        }        

        return sendState ;
    }

    private findTarget(first: string, last: string) : string {
        let ret: string = last ;
        if (ProjectGitStateTracker.releaseRegex.exec(last)) {
            ret = path.basename(first) ;
            if (!ret.startsWith('TARGET_')) {
                ret = path.basename(path.dirname(first)) ;
            }
        }
        return ret;
    }

    private start(id: number, target: string) {
        if (!this.states_.has(id)) {
            this.states_.set(id, { id: id, target: target, percent: 0, done: false, operation: 'Starting' }) ;
        }
        else {
            let s = this.states_.get(id)! ;
            s.target = target ;
            s.percent = 0 ;
            s.done = false ;
            s.operation = 'Starting' ;
        }
    }

    private progress(id: number, oper:string, percent: number) {
        if (this.states_.has(id)) {
            let s = this.states_.get(id)! ;
            s.operation = oper ;
            s.percent = percent ;
        }
    }

    private done(id: number) {
        if (this.states_.has(id)) {
            this.states_.delete(id) ;
        }
    }
} ;
