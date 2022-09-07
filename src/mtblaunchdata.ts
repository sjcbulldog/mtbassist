
export class MTBLaunchConfig {
    public basedir: string = "";
    public cmdline: string[] = [] ;
    public displayName: string = "" ;
    public extensions: string[] = [] ;
    public icon: string = "" ;
    public id: string = "" ;
    public location: string = "" ;
    public operation: string = "" ;
    public priorityExtensions: string[] = [];
    public project:string = "" ;
    public scope: string = "" ;
    public shortName: string = "" ;
    public toolId: string = "" ;
    public type: string = "" ;
    public version: string = "" ;

    constructor() {
    }
}

export class MTBLaunchDoc {
    public location: string = "" ;
    public path: string[] = [];
    public project: string = "";
    public title: string = "";
    public type: string = "";

    constructor() {
    }
}

export class MTBLaunchInfo {
    public configs: MTBLaunchConfig[] ;
    public docs: MTBLaunchDoc[] ;

    constructor(data: string) {

        if (data.length > 0) {
            data = data.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
            let jsonobj = JSON.parse(data) ;

            this.configs = this.parseConfigs(jsonobj.configs) ;
            this.docs = this.parseDocs(jsonobj.documentation) ;
        }
        else {
            this.configs = [] ;
            this.docs = [] ;
        }
    }

    parseConfigs(configs: any) : MTBLaunchConfig[] {
        let ret : MTBLaunchConfig[] = [] ;
        configs.forEach(function (config: any) {
            let one:MTBLaunchConfig = new MTBLaunchConfig() ;
            one.basedir = config["base-dir"] ;
            one.cmdline = config["cmdline"] ;
            one.displayName = config["display-name"] ;
            one.extensions = config["extensions"] ;
            one.icon = config["icon"] ;
            one.id = config["id"] ;
            one.location = config["location"] ;
            one.operation = config["new"] ;
            one.priorityExtensions = config["priority-extensions"] ;
            one.project = config["project"] ;
            one.scope = config["scope"] ;
            one.shortName = config["short-name"] ;
            one.toolId = config["tool-id"] ;
            one.type = config["type"] ;
            one.version = config["version"]
            ret.push(one) ;
        }) ;

        return ret ;
    }

    parseDocs(docs: any) : MTBLaunchDoc[] {
        let ret : MTBLaunchDoc[] = [] ;
        docs.forEach(function (doc: any) {
            let one : MTBLaunchDoc = new MTBLaunchDoc() ;
            one.location = doc["location"] ;
            one.path = doc["path"] ;
            one.project = doc["project"] ;
            one.title = doc["title"] ;
            one.type = doc["type"] ;
            ret.push(one) ;
        }) ;

        return ret ;
    }
}

