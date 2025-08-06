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
        this.backendService.log(`Project creation status: ${JSON.stringify(response)}`);
        const resolver = this.bspResolvers.get(respdata.uuid);
        if (resolver) {
            this.bspResolvers.delete(respdata.uuid);                
            resolver(respdata.success);
        }
    }
}
