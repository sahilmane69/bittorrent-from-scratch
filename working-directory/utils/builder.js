export function buildInterested() {
    const buffer = Buffer.alloc(5);
    buffer.writeUInt32BE(1, 0);
    buffer.writeUInt8(2, 4);
    return buffer;
}
