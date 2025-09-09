
export interface DeviceMemorySegment {
    proc: string ;
    start: number;
    size: number;
    name: string;
    description?: string;
}

const explorerMemoryMap: DeviceMemorySegment[] = [
    { proc: 'cm55', start: 0x00000000, size: 0x00040000, name: 'itcm', description: 'Instruction Tightly Coupled Memory' },
    { proc: 'cm55', start: 0x20000000, size: 0x00040000, name: 'dtcm', description: 'Data Tightly Coupled Memory' },
    { proc: '*', start: 0x22000000, size: 0x02000000, name: 'rram', description: 'RRAM non-volatile memory' },
    { proc: '*', start: 0x26000000, size: 0x00500000, name: 'socmem', description: 'Shared System RAM' },
    { proc: '*', start: 0x22000000, size: 0x00080000, name: 'sram0', description: 'Cortex-M33 System SRAM Bank 0' },    
    { proc: '*', start: 0x24080000, size: 0x00080000, name: 'sram1', description: 'Cortex-M33 System SRAM Bank 1' },        
    { proc: '*', start: 0x60000000, size: 0x04000000, name: 'xip-0', description: 'SMIF-0 connected external memory' },
    { proc: '*', start: 0x64000000, size: 0x04000000, name: 'xip-1', description: 'SMIF-1 connected external memory' },
] ;

export class MemoryMap {
    static getMemoryMap(device: string): DeviceMemorySegment[] {
        return explorerMemoryMap ;
    }
}