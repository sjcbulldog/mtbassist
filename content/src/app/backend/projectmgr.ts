/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BackEndToFrontEndResponse, CreateProjectResponse } from "../../comms";
import { BackendService } from "./backend-service";

export class ProjectManager {
    private bspResolvers: Map<string, ((success: boolean) => void)> = new Map();
    private backendService: BackendService;

    constructor(backendService: BackendService) {
        this.backendService = backendService;
        this.backendService.registerHandler('createProjectResult', this.createProjectResponse.bind(this));
    }

    public createProject(projectInfo: any) : Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            projectInfo.uuid = crypto.randomUUID();
            this.bspResolvers.set(projectInfo.uuid, resolve);            
            this.backendService.sendRequest({
                request: 'createProject',
                data: projectInfo
            });
        });
    }

    public createProjectResponse(response: BackEndToFrontEndResponse): void {
        let respdata : CreateProjectResponse = response.data as CreateProjectResponse;
        const resolver = this.bspResolvers.get(respdata.uuid);
        if (resolver) {
            this.bspResolvers.delete(respdata.uuid);                
            resolver(respdata.success);
        }
    }
}
