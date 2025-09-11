import * as path from 'path' ;
import * as fs from 'fs' ;

export class DeviceDBManager {
    private static readonly devicePropsFile = 'props.json' ;
    private basedir_ : string ;
    private props_ : any = null ;

    public constructor(dir: string) {
        this.basedir_ = dir ;
    }

    public initialize() : Promise<boolean> {
        return new Promise((resolve, reject) => {
            let props = path.join(this.basedir_, DeviceDBManager.devicePropsFile) ;
            if (!fs.existsSync(props)) {
                reject(new Error(`device-db property file not found: ${props}`)) ;
                return ;
            }

            let data = fs.readFile(props, 'utf8', (err, data) => {
                if (err) {
                    reject(new Error(`error reading device-db property file: ${err.message}`)) ;
                    return ;
                }
                try {
                    this.props_ = JSON.parse(data) ;
                    if (!this.props_.devicedb) {
                        reject(new Error(`invalid device-db: property file missing 'devicedb' entry`)) ;
                        return ;
                    }

                    if (!this.props_.opt) {
                        reject(new Error(`invalid device-db: property file missing 'opt' entry`)) ;
                        return ;
                    }

                    if (!this.props_.opt['devicedb-index']) {
                        reject(new Error(`invalid device-db: property file missing 'opt/devicedb-index' entry`)) ;
                        return ;
                    } 
                } catch(e) {
                    reject(new Error(`error parsing device-db property file: ${e}`)) ;
                    return ;
                }
                resolve(true) ;
            });
        }) ;
    }

    public getDevicePaths(mpn: string, view: string) : string[] | null {
        let devdir = this.findDeviceDir(mpn) ;
        if (!devdir) {
            return null ;
        }

        let dirs: string[] = [] ;
        while (devdir !== this.basedir_) {
            let viewdir = path.join(devdir, view) ;
            if (fs.existsSync(viewdir) && fs.statSync(viewdir).isDirectory()) {
                dirs.push(viewdir) ;
            }
            devdir = path.dirname(devdir) ;
        }

        return dirs.length ? dirs : null ;
    }

    private findDeviceDir(mpn: string) : string | null {
        let devices = this.props_.opt['devicedb-index'] ;
        let device = devices.find((entry: any) => entry.name === mpn) ;
        if (!device) {
            return null ;
        }

        return path.join(this.basedir_, device.path) ;
    }
}
