
export interface DeviceMemorySegment {
    proc: string ;
    start: number;
    size: number;
    name: string;
    description?: string;
    main?: string ;
}


const explorerMemoryMap: DeviceMemorySegment[] = [
    { proc: 'cm55', start: 0x00000000, size: 0x00040000, name: 'itcm', description: 'Instruction Tightly Coupled Memory'},
    { proc: 'cm33', start: 0x48000000, size: 0x00040000, name: 'itcm-m33-ns', description: 'Instruction Tightly Coupled Memory', main: 'itcm' },
    { proc: 'cm33', start: 0x58000000, size: 0x00040000, name: 'itcm-m33-s', description: 'Instruction Tightly Coupled Memory', main: 'itcm' },

    { proc: '*',    start: 0x20000000, size: 0x00040000, name: 'dtcm', description: 'Data Tightly Coupled Memory' },
    { proc: 'cm33', start: 0x48040000, size: 0x00040000, name: 'dtcm-m33-ns', description: 'Data Tightly Coupled Memory', main: 'dtcm' },
    { proc: 'cm33', start: 0x58040000, size: 0x00040000, name: 'dtcm-m33-s', description: 'Data Tightly Coupled Memory', main: 'dtcm' },

    { proc: 'cm33', start: 0x02000000, size: 0x02000000, name: 'rram-ns-c', description: 'RRAM non-volatile memory', main: 'rram' },
    { proc: 'cm33', start: 0x12000000, size: 0x02000000, name: 'rram-s-c', description: 'RRAM non-volatile memory', main: 'rram' },
    { proc: '*',    start: 0x22000000, size: 0x02000000, name: 'rram', description: 'RRAM non-volatile memory'},
    { proc: 'cm33', start: 0x32000000, size: 0x02000000, name: 'rram-s-s', description: 'RRAM non-volatile memory', main: 'rram' },

    { proc: 'cm33', start: 0x06000000, size: 0x00500000, name: 'socmem-ns-c', description: 'Shared System RAM', main: 'socmem' },
    { proc: 'cm33', start: 0x16000000, size: 0x00500000, name: 'socmem-s-c', description: 'Shared System RAM', main: 'socmem' },
    { proc: '*',    start: 0x26000000, size: 0x00500000, name: 'socmem', description: 'Shared System RAM'},
    { proc: 'cm33', start: 0x36000000, size: 0x00500000, name: 'socmem-s-s', description: 'Shared System RAM', main: 'socmem' },

    { proc: '*', start: 0x04000000, size: 0x00080000, name: 'sram-ns-c', description: 'Cortex-M33 System SRAM', main: 'sram' },    
    { proc: '*', start: 0x14000000, size: 0x00080000, name: 'sram-s-c', description: 'Cortex-M33 System SRAM', main: 'sram' },   
    { proc: '*', start: 0x24000000, size: 0x00080000, name: 'sram', description: 'Cortex-M33 System SRAM' },       
    { proc: '*', start: 0x34000000, size: 0x00080000, name: 'sram-s-s', description: 'Cortex-M33 System SRAM', main: 'sram' },   

    { proc: '*', start: 0x08000000, size: 0x04000000, name: 'xip-0-ns-c', description: 'SMIF-0 connected external memory', main: 'xip-0' },
    { proc: '*', start: 0x18000000, size: 0x04000000, name: 'xip-0-s-c', description: 'SMIF-0 connected external memory', main: 'xip-0' },
    { proc: '*', start: 0x28000000, size: 0x04000000, name: 'xip-0', description: 'SMIF-0 connected external memory' },
    { proc: '*', start: 0x38000000, size: 0x04000000, name: 'xip-0-s-s', description: 'SMIF-0 connected external memory', main: 'xip-0' },

    { proc: '*', start: 0x0c000000, size: 0x04000000, name: 'xip-1-ns-c', description: 'SMIF-1 connected external memory', main: 'xip-1' },
    { proc: '*', start: 0x1c000000, size: 0x04000000, name: 'xip-1-s-c', description: 'SMIF-1 connected external memory', main: 'xip-1' },
    { proc: '*', start: 0x2c000000, size: 0x04000000, name: 'xip-1', description: 'SMIF-1 connected external memory' },
    { proc: '*', start: 0x3c000000, size: 0x04000000, name: 'xip-1-s-s', description: 'SMIF-1 connected external memory', main: 'xip-1' },
] ;

export class MemoryMap {
    static getMemoryMap(device: string): DeviceMemorySegment[] {
        return explorerMemoryMap ;
    }
}