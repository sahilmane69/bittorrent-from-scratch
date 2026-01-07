export function buildRequest(index, begin, length) {
    const buffer = Buffer.alloc(17);
    buffer.writeUInt32BE(13, 0);
    buffer.writeUInt8(6, 4);
    buffer.writeUInt32BE(index, 5);
    buffer.writeUInt32BE(begin, 9);
    buffer.writeUInt32BE(length, 13);
    return buffer;
}
