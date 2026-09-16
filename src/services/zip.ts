export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export class ZipBuilder {
  private static crcTable: Uint32Array | null = null;

  private static getCrcTable(): Uint32Array {
    if (!this.crcTable) {
      const table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
          c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[i] = c >>> 0;
      }
      this.crcTable = table;
    }
    return this.crcTable;
  }

  private static calculateCrc32(data: Uint8Array): number {
    const table = this.getCrcTable();
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  public static async createZip(entries: ZipEntry[]): Promise<Blob> {
    const encoder = new TextEncoder();
    const parts: Uint8Array[] = [];
    const centralDirectoryParts: Uint8Array[] = [];

    let offset = 0;

    for (const entry of entries) {
      const nameBytes = encoder.encode(entry.name);
      const dataBytes = entry.data;
      const crc32 = this.calculateCrc32(dataBytes);
      const size = dataBytes.length;

      const localHeader = new Uint8Array(30 + nameBytes.length);
      const localView = new DataView(localHeader.buffer);

      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, 0, true);
      localView.setUint16(12, 0, true);
      localView.setUint32(14, crc32, true);
      localView.setUint32(18, size, true);
      localView.setUint32(22, size, true);
      localView.setUint16(26, nameBytes.length, true);
      localView.setUint16(28, 0, true);
      localHeader.set(nameBytes, 30);

      parts.push(localHeader);
      parts.push(dataBytes);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(centralHeader.buffer);

      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, 0, true);
      centralView.setUint16(14, 0, true);
      centralView.setUint32(16, crc32, true);
      centralView.setUint32(20, size, true);
      centralView.setUint32(24, size, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      centralHeader.set(nameBytes, 46);

      centralDirectoryParts.push(centralHeader);

      offset += localHeader.length + dataBytes.length;
    }

    const centralDirectoryOffset = offset;
    let centralDirectorySize = 0;
    for (const part of centralDirectoryParts) {
      centralDirectorySize += part.length;
      parts.push(part);
    }

    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);

    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(4, 0, true);
    eocdView.setUint16(6, 0, true);
    eocdView.setUint16(8, entries.length, true);
    eocdView.setUint16(10, entries.length, true);
    eocdView.setUint32(12, centralDirectorySize, true);
    eocdView.setUint32(16, centralDirectoryOffset, true);
    eocdView.setUint16(20, 0, true);

    parts.push(eocd);

    return new Blob(parts as BlobPart[], { type: 'application/zip' });
  }
}
