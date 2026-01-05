export function parseCompactPeers(buffer) {
    const peers = [];

    for (let i = 0; i < buffer.length; i += 6) {
        const ip = `${buffer[i]}.${buffer[i + 1]}.${buffer[i + 2]}.${buffer[i + 3]}`;
        const port = buffer.readUInt16BE(i + 4);

        peers.push({ ip, port });
    }

    return peers;
}