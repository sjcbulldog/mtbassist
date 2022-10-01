import { MTBApp } from "./mtbapp";
import { MTBBoard } from "./mtbboard";
import { MtbManifestLoader } from "./mtbmanifestloader";
import { MTBMiddleware } from "./mtbmiddleware";


export class MtbManifestDb
{
    public isLoaded : boolean ;
    public isLoading : boolean ;
    public hadError: boolean ;

    apps: Map<string, MTBApp> ;
    boards: Map<string, MTBBoard>
    middleware: Map<string, MTBMiddleware> ;

    manifestLoader: MtbManifestLoader ;

    constructor() {
        this.apps = new Map<string, MTBApp>() ;
        this.boards = new Map<string, MTBBoard>() ;
        this.middleware = new Map<string, MTBMiddleware>() ;

        this.isLoaded = false ;
        this.isLoading = true ;
        this.hadError = false ;
        this.manifestLoader = new MtbManifestLoader(this) ;
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

    public addApp(app: MTBApp) {
        let finalapp : MTBApp | undefined = app ;

        if (this.apps.has(app.id)) {
            //
            // Need to merge, the merge might result in an error, so we remove the
            // entry now and add it back if necessary
            //
            this.apps.delete(app.id) ;
            finalapp = this.mergeApps(this.apps.get(app.id)!, app) ;
        }

        if (finalapp) {
            this.apps.set(app.id, app) ;
        }
    }

    public addBoard(board: MTBBoard) {

    }

    public addMiddleware(middleware: MTBMiddleware) {
        
    }

    mergeApps(app1: MTBApp, app2: MTBApp) : MTBApp | undefined {
        return undefined ;
    }
}