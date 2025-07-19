
export class MTBCommand {
    private exe_ : string ;
    private args_ : string[] ;

    public constructor(exe: string, args : string[]) {
        this.exe_ = exe ;
        this.args_ = args ;
    }

    public get exe() : string {
        return this.exe_ ;
    }

    public get args() : string[] {
        return this.args_ ;
    }
}