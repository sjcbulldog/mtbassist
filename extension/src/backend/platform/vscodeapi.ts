import { PlatformType } from "../../comms";
import { PlatformAPI } from "./platformapi";

export class VSCodeAPI implements PlatformAPI {
    getPlatform(): PlatformType {
        return 'vscode';
    }
}