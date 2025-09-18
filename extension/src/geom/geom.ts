
export class GeomSegment {
    public constructor(public start: number, public length: number) {
    }
}

export class GeomElement {
    private segments_ : GeomSegment[] = [];

    public constructor() {
    }

    public addSegment(segment: GeomSegment): void {
        this.segments_.push(new GeomSegment(segment.start, segment.length));
    }

    public addSegmentFromPoints(start: number, end: number): void {
        if (end < start) {
            throw new Error('End point must be greater than or equal to start point');
        }

        this.segments_.push(new GeomSegment(start, end - start));
    }

    public addSegmentFromPointAndLength(start: number, length: number): void {
        if (length < 0) {
            throw new Error('Length must be non-negative');
        }
        this.segments_.push(new GeomSegment(start, length));
    }

    public get segments(): GeomSegment[] {
        return this.segments_;
    }

    public clear(): void {
        this.segments_ = [];
    }

    public get length() : number {
        return this.segments_.length ;
    }

    public merge() : void {
        let i = 0 ;
        while (i < this.segments_.length - 1) {
            let seg1 = this.segments_[i] ;
            let seg2 = this.segments_[i+1] ;
            if (seg1.start + seg1.length === seg2.start) {
                // Merge seg1 and seg2
                seg1.length += seg2.length;
                this.segments_.splice(i + 1, 1);
            } else {
                i++;
            }
        }
    }
}
