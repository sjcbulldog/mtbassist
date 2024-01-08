import * as vscode from 'vscode';
import { MTBExtensionInfo, MessageType } from './mtbextinfo';

export async function checkHardware() : Promise<void> {
    let ret: Promise<void> = new Promise<void>((resolve, reject) => {
        MTBExtensionInfo.getMtbExtensionInfo().logMessage(MessageType.info, "Probing for attached hardware") ;
        resolve() ;
    }) ;

    return ret;
}
