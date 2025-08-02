import { PlatformType } from "../../comms";
import { PlatformAPI } from "./platformapi";

export class BrowserAPI implements PlatformAPI {
    getPlatform(): PlatformType {
        return 'browser';
    }
}
    