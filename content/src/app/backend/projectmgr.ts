import { BackEndToFrontEndResponse, CreateProjectResponse } from "../../comms";
import { BackendService } from "./backend-service";

export class ProjectManager {
    private bspResolvers: Map<string, ((success: boolean) => void)> = new Map();
    private backendService: BackendService;

    constructor(backendService: BackendService) {
        this.backendService = backendService;
    }

    public createProject(projectInfo: any) : Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            projectInfo.uuid = crypto.randomUUID();
            this.backendService.sendRequest({
                request: 'createProject',
                data: projectInfo
            });
            this.bspResolvers.set(projectInfo.uuid, resolve);
        });
    }

    public createProjectResponse(response: BackEndToFrontEndResponse): void {
        let respdata : CreateProjectResponse = response.data as CreateProjectResponse;
        if (respdata.success) {
            this.backendService.log(`Project created successfully: ${respdata.uuid}`);
            const resolver = this.bspResolvers.get(respdata.uuid);
            if (resolver) {
                resolver(true);
                this.bspResolvers.delete(respdata.uuid);
            }
        }
        else {
            this.backendService.log(`Project creation failed: ${respdata.message}`);
            const resolver = this.bspResolvers.get(respdata.uuid);
            if (resolver) {
                resolver(false);
                this.bspResolvers.delete(respdata.uuid);
            }
        }
    }
}
