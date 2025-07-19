
export class MTBDirectoryList {
    public readonly projdir: string ;
    public readonly localdir: string ;
    public readonly shareddir: string ;
    public readonly globaldir: string ;

    constructor(projdir: string, localdir: string, shareddir: string, globaldir: string) {
        this.projdir = projdir ;
        this.localdir = localdir ;
        this.shareddir = shareddir ;
        this.globaldir = globaldir ;
    }
}