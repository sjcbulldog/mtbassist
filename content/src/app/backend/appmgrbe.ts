import { ApplicationStatusData, BackEndToFrontEndResponse } from "../../comms";
import { BackendService } from "./backend-service";

export class AppStatusBackend {
    private appStatusResolvers: (() => void)[] = [];
    private parent_ : BackendService;

    constructor(private backendService: BackendService) {
        this.parent_ = backendService;
        this.parent_.registerHandler('appStatusResult', this.processAppStatus.bind(this));
    }

    public refreshAppStatus(): Promise<void> {
        let ret = new Promise<void>((resolve, reject) => {
            this.appStatusResolvers.push(resolve);
            this.parent_.sendRequest({
                request: 'getAppStatus',
                data: null
            });
        });
        return ret;
    }

    public processAppStatus(cmd: BackEndToFrontEndResponse): void {
        const appStatusData: ApplicationStatusData = cmd.data as ApplicationStatusData;
        this.backendService.appStatusData.next(appStatusData);
        for (let resolver of this.appStatusResolvers) {
            resolver();
        }
    }
}