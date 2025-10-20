import * as fs from 'fs' ;

export class Region {
    constructor(public description: string, public domain: string, public memoryId: string, public offset: number, 
                public size: number, public regionId: string, public reservedGuid: string) {
    }
}


export class DesignModus {
    private regions: Region[] = [] ;

    constructor(public filename: string) {
        this.filename = filename;
    }

    public init() : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            var parseString = require('xml2js').parseString;
            let data: string ;
            try {
                data = fs.readFileSync(this.filename, 'utf8') ;
            }
            catch(err) {
                reject(err) ;
                return ;
            }

            parseString(data, { explicitArray: false }, (err: Error, result: any) => {
                if (err) {
                    reject(err) ;
                    return ;
                } 

                if (!result.Configuration) {
                    reject(new Error('Invalid design.modus file: Missing Configuration element')) ;
                    return ;
                }

                for(let dev of result.Configuration.Devices.Device) {
                    for(let config of dev.BlockConfig.Personality) {
                        let tmp = config.$.template ;
                        if (tmp === 'memory_region_data') {
                            this.extractRegionFromObj(config.Parameters.Param) ;
                        }
                    }
                }

                resolve() ;
            }) ;
        });
    }

    public getRegions() : Region[] {
        return this.regions ;
    }

    private extractRegionFromObj(params: any[]) {
        let description: string | undefined = undefined ;
        let domain: string | undefined = undefined ;
        let memoryId: string | undefined = undefined ;
        let offset: number | undefined = undefined ;
        let regionId: string | undefined = undefined ;
        let reservedGuid: string | undefined = undefined ;
        let size: number | undefined = undefined ;

        for(let param of params) {
            switch(param.$.id) {
                case 'description':
                    description = param.$.value ;
                    break ;
                case 'domain':
                    domain = param.$.value ;
                    break ;
                case 'memoryId':
                    memoryId = param.$.value ;
                    break ;
                case 'offset':
                    offset = parseInt(param.$.value, 16) ;
                    break ;
                case 'regionId':
                    regionId = param.$.value ;
                    break ;
                case 'reservedGuid':
                    reservedGuid = param.$.value ;
                    break ;
                case 'size':
                    size = parseInt(param.$.value, 16) ;
                    break ;
            }
        }

        if (description !== undefined && description.length > 0 && domain !== undefined && memoryId !== undefined && 
            offset !== undefined && regionId !== undefined && reservedGuid !== undefined && size !== undefined) {
            this.regions.push(new Region(description, domain, memoryId, offset, size, regionId, reservedGuid));
        }
    }
}
