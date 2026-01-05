import net from "net";
import crypto from "crypto";

function generatePeerId() {
    const id = "-SM0001-" + crypto.randomBytes(12).toString("hex").slice(0, 12);
    return Buffer.from(id);
}

/* Build BitTorrent handshake (68 bytes) */
function buildHandshake(infoHash, peerId) {
    const protocol = "BitTorrent protocol";
    const buffer = Buffer.alloc(68);

    buffer.writeUInt8(protocol.length, 0);                // pstrlen
    buffer.write(protocol, 1);                            // pstr
    buffer.fill(0, 1 + protocol.length, 1 + protocol.length + 8); // reserved
    infoHash.copy(buffer, 1 + protocol.length + 8);       // info_hash
    peerId.copy(buffer, 1 + protocol.length + 8 + 20);    // peer_id

    return buffer;
}

/* Validate received handshake */
function handleHandshakeResponse(data, infoHash) {
    const pstrlen = data.readUInt8(0);
    const protocol = data.slice(1, 1 + pstrlen).toString();

    if (protocol !== "BitTorrent protocol") {
        console.log("Invalid protocol");
        return;
    }

    const receivedInfoHash = data.slice(
        1 + pstrlen + 8,
        1 + pstrlen + 8 + 20
    );

    if (!receivedInfoHash.equals(infoHash)) {
        console.log("Info hash mismatch");
        return;
    }

    console.log("Handshake successful ");
}

/* Connect to ONE peer */
export function connectToPeer(peer, infoHash) {
    const socket = new net.Socket();
    const peerId = generatePeerId();
    const handshake = buildHandshake(infoHash, peerId);

    socket.connect(peer.port, peer.ip, () => {
        console.log(`Connected to peer ${peer.ip}:${peer.port}`);
        socket.write(handshake);
    });

    socket.on("data", (data) => {
        handleHandshakeResponse(data, infoHash);
        socket.end();
    });

    socket.on("error", (err) => {
        console.log(`Peer error ${peer.ip}:${peer.port} → ${err.message}`);
    });

    socket.setTimeout(8000, () => {
        console.log("Peer timeout");
        socket.destroy();
    });
}
