import { MtbManifestLoader } from "./mtbmanifestloader";


export class MtbManifestDb
{
    public isLoaded : boolean ;
    public isLoading : boolean ;
    public hadError: boolean ;

    manifestLoader: MtbManifestLoader ;

    constructor() {
        this.isLoaded = false ;
        this.isLoading = true ;
        this.hadError = false ;
        this.manifestLoader = new MtbManifestLoader() ;
        this.manifestLoader.loadManifestData()
            .then(() => {
                this.isLoaded = true ;
                this.isLoading = false ;
            })
            .catch(err => {
                this.isLoading = false ;
                this.hadError = true ;
            }) ;
    }
}