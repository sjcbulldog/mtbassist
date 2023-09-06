import * as vscode from 'vscode';
import { MessageType, MTBExtensionInfo } from './mtbextinfo';
import { theModusToolboxApp } from './mtbapp/mtbappinfo';

let stoppedThreadID: number = -1;
let stoppedFrameID: number = -1;

class ResultCode {
    public value_ : number ;
    public name_ : string ;
    public desc_ : string ;
    public module_ : string ;
    public code_ : number ;
    public type_ : string ;

    constructor(value: number, name: string, desc: string, module: string, code: number, type: string) {
        this.value_ = value ;
        this.name_ = name ;
        this.desc_ = desc ;
        this.module_ = module ;
        this.code_ = code ;
        this.type_ = type ;
    }
}

let modulesNames = [
    {
        name: "CY_RSLT_MODULE_DRIVER_SAR",
        value: 0x0001
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_DFU",
        value: 0x0006
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_CAPSENSE",
        value: 0x0007
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_USB_DEV",
        value: 0x0008
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_CTB",
        value: 0x000b
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_CRYPTO",
        value: 0x000c
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_SYSPM",
        value: 0x0010
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_SYSLIB",
        value: 0x0011
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_SYSCLK",
        value: 0x0012
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_DMA",
        value: 0x0013
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_FLASH",
        value: 0x0014
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_SYSINT",
        value: 0x0015
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_GPIO",
        value: 0x0016
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_SYSANALOG",
        value: 0x0017
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_CTDAC",
        value: 0x0019
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_EFUSE",
        value: 0x001a
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_EM_EEPROM",
        value: 0x001b
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_PROFILE",
        value: 0x001e
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_I2S",
        value: 0x0020
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_IPC",
        value: 0x0022
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_LPCOMP",
        value: 0x0023
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_PDM_PCM",
        value: 0x0026
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_RTC",
        value: 0x0028
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_SCB",
        value: 0x002a
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_SMIF",
        value: 0x002c
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_TCPWM",
        value: 0x002d
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_PROT",
        value: 0x0030
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_TRIGMUX",
        value: 0x0033
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_WDT",
        value: 0x0034
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_MCWDT",
        value: 0x0035
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_LIN",
        value: 0x0037
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_LVD",
        value: 0x0039
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_SD_HOST",
        value: 0x003a
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_USBFS",
        value: 0x003b
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_DMAC",
        value: 0x003f
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_SEGLCD",
        value: 0x0040
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_CSD",
        value: 0x0041
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_SMARTIO",
        value: 0x0042
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_CSDIDAC",
        value: 0x0044
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_CANFD",
        value: 0x0045
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_PRA",
        value: 0x0046
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_MSC",
        value: 0x0047
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_ADCMIC",
        value: 0x0048
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_MSCLP",
        value: 0x0049
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_EVTGEN",
        value: 0x004a
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_SAR2",
        value: 0x004b
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_KEYSCAN",
        value: 0x0072
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_PDM_PCM2",
        value: 0x0073
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_CRYPTOLITE",
        value: 0x0074
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_SYSFAULT",
        value: 0x0076
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_LVD_HT",
        value: 0x0078
    },
    {
        name: "CY_RSLT_MODULE_DRIVER_WHD",
        value: 0x0080
    },
    {
        name: "CY_RSLT_MODULE_ABSTRACTION_HAL",
        value: 0x0100
    },
    {
        name: "CY_RSLT_MODULE_ABSTRACTION_BSP",
        value: 0x0180
    },
    {
        name: "CY_RSLT_MODULE_ABSTRACTION_FS",
        value: 0x0181
    },
    {
        name: "CY_RSLT_MODULE_ABSTRACTION_RESOURCE",
        value: 0x0182
    },
    {
        name: "CY_RSLT_MODULE_ABSTRACTION_OS",
        value: 0x0183
    },
    {
        name: "CY_RSLT_MODULE_BOARD_LIB_RETARGET_IO",
        value: 0x1A0
    },
    {
        name: "CY_RSLT_MODULE_BOARD_LIB_RGB_LED",
        value: 0x01A1
    },
    {
        name: "CY_RSLT_MODULE_BOARD_LIB_SERIAL_FLASH",
        value: 0x01A2
    },
    {
        name: "CY_RSLT_MODULE_BOARD_LIB_WHD_INTEGRATION",
        value: 0x01A3
    },
    {
        name: "CY_RSLT_MODULE_BOARD_SHIELD_028_EPD",
        value: 0x01B8
    },
    {
        name: "CY_RSLT_MODULE_BOARD_SHIELD_028_TFT",
        value: 0x01B9
    },
    {
        name: "CY_RSLT_MODULE_BOARD_SHIELD_032",
        value: 0x01BA
    },
    {
        name: "CY_RSLT_MODULE_BOARD_SHIELD_028_SENSE",
        value: 0x01BB
    },
    {
        name: "CY_RSLT_MODULE_BOARD_HARDWARE_BMI160",
        value: 0x01C0
    },
    {
        name: "CY_RSLT_MODULE_BOARD_HARDWARE_E2271CS021",
        value: 0x01C1
    },
    {
        name: "CY_RSLT_MODULE_BOARD_HARDWARE_THERMISTOR",
        value: 0x01C2
    },
    {
        name: "CY_RSLT_MODULE_BOARD_HARDWARE_SSD1306",
        value: 0x01C3
    },
    {
        name: "CY_RSLT_MODULE_BOARD_HARDWARE_ST7789V",
        value: 0x01C4
    },
    {
        name: "CY_RSLT_MODULE_BOARD_HARDWARE_LIGHT_SENSOR",
        value: 0x01C5
    },
    {
        name: "CY_RSLT_MODULE_BOARD_HARDWARE_AK4954A",
        value: 0x01C6
    },
    {
        name: "CY_RSLT_MODULE_BOARD_HARDWARE_BMX160",
        value: 0x01C7
    },
    {
        name: "CY_RSLT_MODULE_BOARD_HARDWARE_DPS3XX",
        value: 0x01C8
    },
    {
        name: "CY_RSLT_MODULE_BOARD_HARDWARE_WM8960",
        value: 0x01C9
    },
    {
        name: "CY_RSLT_MODULE_BOARD_HARDWARE_XENSIV_PASCO2",
        value: 0x01CA
    },
    {
        name: "CY_RSLT_MODULE_BOARD_HARDWARE_XENSIV_BGT60TRXX",
        value: 0x01CC
    },
    {
        name: "CY_RSLT_MODULE_BOARD_HARDWARE_LM49450",
        value: 0x01CE
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_MNDS",
        value: 0x200
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_AWS",
        value: 0x201
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_JSON",
        value: 0x202
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_LINKED_LIST",
        value: 0x203
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_COMMAND_CONSOLE",
        value: 0x204
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_HTTP_SERVER",
        value: 0x205
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_ENTERPRISE_SECURITY",
        value: 0x206
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_TCPIP",
        value: 0x207
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_MW",
        value: 0x208
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_TLS",
        value: 0x209
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_SECURE_SOCKETS",
        value: 0x20a
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_WCM",
        value: 0x20b
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_LWIP_WHD_PORT",
        value: 0x20c
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_OTA_UPDATE",
        value: 0x20d
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_HTTP_CLIENT",
        value: 0x20e
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_ML",
        value: 0x20f
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_KVSTORE",
        value: 0x250
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_LIN",
        value: 0x0251
    },
    {
        name: "CY_RSLT_MODULE_MIDDLEWARE_UBM",
        value: 0x0252
    }
];

export function mtbDecodeInit() {
    if (theModusToolboxApp === undefined) {
        return;
    }

    for (let project of theModusToolboxApp.projects) {
        for (let asset of project.assets) {

        }
    }
}

export function mtbDecodeDebugAdapterEventProcessor(event: vscode.DebugSessionCustomEvent) {
    if (event.event === "custom-stop") {
        stoppedThreadID = event.body.threadID;
    }
}

async function getStackFrames(session: vscode.DebugSession): Promise<any> {
    let ret: Promise<any> = new Promise<any>((resolve, reject) => {
        session.customRequest('stackTrace', { threadId: stoppedThreadID })
            .then((result) => {
                resolve(result);
            });
    });

    return ret;
}

async function getExpressionValue(session: vscode.DebugSession, expr: string): Promise<any> {
    let ret: Promise<any> = new Promise<any>(async (resolve, reject) => {
        let frames = await getStackFrames(session);
        session.customRequest('evaluate', { expression: expr, frameId: frames.stackFrames[0].id })
            .then((result) => {
                resolve(result);
            });
    });

    return ret;
}

function typeToString(type: number): string {
    let str = "UNKNOWN";

    if (type === 0) {
        str = "Info";
    }
    else if (type === 1) {
        str = "Warning";
    }
    else if (type === 2) {
        str = "Error";
    }
    else if (type === 3) {
        str = "Fatal";
    }

    return str;
}

function moduleToString(module: number) : string {
    for(let mod of modulesNames) {
        if (module === mod.value) {
            return mod.name ;
        }
    }

    return "UNKNOWN" ;
}

function getResultCode(value: number) : ResultCode {
    let code = (value & 0xffff);
    let type = ((value >> 16) & 0x03);
    let module = ((value >> 18) & 0x3fff);

    const desc: string = "A memory alignment issue was detected." ;
    const name: string = "CY_RTOS_ALIGNMENT_ERROR" ;
    return new ResultCode(value, name, desc, moduleToString(module), code, typeToString(type)) ;
}


function decodeResult(value: number): string {
    let str: string = "";
    if (value === 0) {
        str = "cyrslt_t: success";
    }
    else {
        let res: ResultCode = getResultCode(value) ;

        str = "Infineon Result Value  \n" ;
        str += " value: " + value.toString(16) + "  \n" ;
        str += " name: " + res.name_ + "  \n" ;
        str += " module: " + res.module_ + "  \n" ;
        str += " type: " + res.type_ + "  \n" ;
        str += " desc: " + res.desc_ + "  \n" ;
    }

    return str;
}

function returnResults(session: vscode.DebugSession, word: string): Promise<vscode.Hover> {
    let promise = new Promise<vscode.Hover>(async (resolve, reject) => {
        let result = await getExpressionValue(session, word);
        if (result.result === null || result.type !== "cy_rslt_t") {
            resolve(new vscode.Hover(""));
        }
        else {
            let str: string = decodeResult(result.result as number);
            resolve(new vscode.Hover(str));
        }
    });
    return promise;
}

export function mtbDecodeResultsForHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
    if (vscode.debug.activeDebugSession) {
        const word = document.getText(
            document.getWordRangeAtPosition(position)
        );
        return returnResults(vscode.debug.activeDebugSession, word);
    }
    else {
        return {
            contents: ['Not in debug session']
        };
    }
}
