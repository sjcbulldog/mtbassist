
export class MTBPack {
    private id_: string ;
    private desc_ : any ;

    constructor(id: string, obj: any) {
        this.id_ = id ;
        this.desc_ = obj ;
    }

    public packType() : string {
        return this.desc_.attributes['pack-type'] ;
    }

    public path() : string {
        return this.desc_.path ;
    }

    public get featureId() : string {
        return this.id_ ;
    }
}