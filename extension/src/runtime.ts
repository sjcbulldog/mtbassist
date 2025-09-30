import * as winston from 'winston';

interface RunTimeTrackerEntry {
    name: string ;
    startTime: number ;
}


export class RunTimeTracker {
    private static instance: RunTimeTracker | undefined = undefined ;

    private entries_: RunTimeTrackerEntry[] = [] ;

    public static initInstance(): RunTimeTracker {
        if (RunTimeTracker.instance === undefined) {
            RunTimeTracker.instance = new RunTimeTracker() ;
        }
        return RunTimeTracker.instance ;
    }

    public static getInstance(): RunTimeTracker {
        if (RunTimeTracker.instance === undefined) {
            throw new Error('RunTimeTracker instance not initialized') ;
        }
        return RunTimeTracker.instance ;
    }

    private constructor() {
        this.mark('RunTimeTracker Initialized') ;
    }

    public mark(name: string): void {
        const entry: RunTimeTrackerEntry = {
            name: name,
            startTime: Date.now()
        } ;
        this.entries_.push(entry) ;
    }

    public printAll(logger: winston.Logger): void {
        logger.info('Run Time Tracker Report:') ;
        for(let i = 1 ; i < this.entries_.length ; i++) {   
            const entry = this.entries_[i] ;
            const prevEntry = this.entries_[i-1] ;
            const duration = entry.startTime - prevEntry.startTime ;
            logger.info(`  ${prevEntry.name} -> ${entry.name}: ${duration} ms, total ${entry.startTime - this.entries_[0].startTime} ms`) ;
        }
    }
}