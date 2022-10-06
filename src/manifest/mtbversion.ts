///
// Copyright 2022 by Apollo Software
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// 	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

export class MTBVersion
{
    public readonly major: number ;
    public readonly minor: number ;
    public readonly patch: number ;
    public readonly build: number ;

    constructor(major?: number, minor? : number, patch?: number, build?:number) {
        if (major !== undefined) {
            this.major = major ;
        }
        else {
            this.major = -1 ;
        }

        if (minor !== undefined) {
            this.minor = minor ;
        }
        else {
            this.minor = -1 ;
        }

        if (patch !== undefined) {
            this.patch = patch ;
        }
        else {
            this.patch = -1 ;
        }

        if (build !== undefined) {
            this.build = build ;
        }
        else {
            this.build = -1 ;
        }
    }

    public static compare(v1: MTBVersion, v2: MTBVersion) : number {
        let ret:number = 0 ;

        if (v1.major > v2.major) {
            ret = 1 ;
        }
        else if (v1.major < v2.major) {
            ret = -1 ;
        }
        else {
            if (v1.minor > v2.minor) {
                ret = 1 ;
            }
            else if (v1.minor < v2.minor) {
                ret = -1 ;
            }
            else {
                if (v1.patch > v2.patch) {
                    ret = 1 ;
                }
                else if (v1.patch < v2.patch) {
                    ret = -1 ;
                }
                else
                {
                    if (v1.build > v2.build) {
                        ret = 1 ;
                    }
                    else if (v1.build < v2.build) {
                        ret = -1 ;
                    }
                }
            }
        }

        return ret ;
    }

    public static fromVersionString(str: string) : MTBVersion {
        let ret: MTBVersion = new MTBVersion() ;
        const regexp : RegExp = new RegExp("^.*v([0-9]+)\\.([0-9]+)\\.([0-9]+)$");
        const match: RegExpExecArray | null = regexp.exec(str) ;

        if (match !== null) {
            let major: number = +match[1] ;
            let minor: number = +match[2] ;
            let patch: number = +match[3] ;
            ret = new MTBVersion(major, minor, patch) ;
        }

        return ret ;
    }
}
