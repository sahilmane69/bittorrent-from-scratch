export function buildHandshake(infoHash, peerId) {
    const protocol = "BitTorrent protocol";
    const buffer = Buffer.alloc(49 + protocol.length);

    let offset = 0;

    buffer.writeUInt8(protocol.length, offset);
    offset += 1;

    buffer.write(protocol, offset);
    offset += protocol.length;

    buffer.fill(0, offset, offset + 8);
    offset += 8;

    infoHash.copy(buffer, offset);
    offset += 20;

    peerId.copy(buffer, offset);
    offset += 20;

    return buffer;
}
