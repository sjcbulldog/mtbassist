
export interface IntelHexData {
    startAddress: number;
    data: Buffer;
}

export interface IntelHexSegment {
    address: number;
    size: number;
}

export class IntelHexFile {
    private segments: IntelHexData[] = [];

    private constructor(segments: IntelHexData[]) {
        this.segments = segments;
    }

    public static async readFile(path: string): Promise<IntelHexFile> {
        const fs = await import('fs/promises');
        const lines = (await fs.readFile(path, 'utf8')).split(/\r?\n/);
        const segments: IntelHexData[] = [];
        let currentData: number[] = [];
        let currentStart: number | null = null;
        let currentAddr = 0;
        let upperAddr = 0;

        function flush() {
            if (currentStart !== null && currentData.length > 0) {
                segments.push({
                    startAddress: currentStart,
                    data: Buffer.from(currentData)
                });
                currentData = [];
                currentStart = null;
            }
        }

        for (const line of lines) {
            if (!line.startsWith(':')) { continue; }
            const byteCount = parseInt(line.substr(1, 2), 16);
            const addr = parseInt(line.substr(3, 4), 16);
            const recordType = parseInt(line.substr(7, 2), 16);
            const data = line.substr(9, byteCount * 2);
            //const checksum = parseInt(line.substr(9 + byteCount * 2, 2), 16);

            if (recordType === 0x00) { // Data
                const absAddr = (upperAddr << 16) + addr;
                if (currentStart === null) {
                    currentStart = absAddr;
                    currentAddr = absAddr;
                } else if (currentAddr !== absAddr) {
                    flush();
                    currentStart = absAddr;
                    currentAddr = absAddr;
                }
                for (let i = 0; i < byteCount; i++) {
                    currentData.push(parseInt(data.substr(i * 2, 2), 16));
                    currentAddr++;
                }
            } else if (recordType === 0x04) { // Extended Linear Address
                flush();
                upperAddr = parseInt(data, 16);
            } else if (recordType === 0x01) { // End Of File
                flush();
                break;
            } else {
                flush();
            }
        }
        flush();
        return new IntelHexFile(segments);
    }

    public getData(address: number, size: number): IntelHexData[] {
        const result: IntelHexData[] = [];
        let remaining = size;
        let addr = address;
        for (const seg of this.segments) {
            const segEnd = seg.startAddress + seg.data.length;
            if (addr >= segEnd) { continue; }
            if (addr + remaining <= seg.startAddress) { break; }
            // Overlap
            const start = Math.max(addr, seg.startAddress);
            const end = Math.min(segEnd, addr + remaining);
            const offset = start - seg.startAddress;
            const len = end - start;
            result.push({
                startAddress: start,
                data: seg.data.slice(offset, offset + len)
            });
            remaining -= len;
            addr += len;
            if (remaining <= 0) { break; }
        }
        return result;
    }

    getSegments(): IntelHexSegment[] {
        return this.segments.map(seg => ({
            address: seg.startAddress,
            size: seg.data.length
        }));
    }
}
