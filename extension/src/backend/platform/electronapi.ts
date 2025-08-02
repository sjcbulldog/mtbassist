import { PlatformType } from "../../comms";
import { PlatformAPI } from "./platformapi";

export class ElectronAPI implements PlatformAPI {
    getPlatform(): PlatformType {
        return 'electron';
    }
}