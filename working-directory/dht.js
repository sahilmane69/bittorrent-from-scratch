import dgram from "dgram";
import crypto from "crypto";
import bencode from "bencode";

const socket = dgram.createSocket("udp4");

const nodeId = crypto.randomBytes(20);

const BOOTSTRAP_NODES = [
    { host: "router.bittorrent.com", port: 6881 },
    { host: "dht.transmissionbt.com", port: 6881 },
    { host: "router.utorrent.com", port: 6881 }
];

function buildPing() {
    return bencode.encode({
        t: crypto.randomBytes(2),
        y: "q",
        q: "ping",
        a: { id: nodeId }
    });
}

function sendPing(node) {
    const message = buildPing();
    socket.send(message, 0, message.length, node.port, node.host);
}

socket.on("message", msg => {
    try {
        const data = bencode.decode(msg);
        if (data.y.toString() === "r") {
            console.log("DHT response from:", data.r.id.toString("hex"));
        }
    } catch {}
});

socket.on("listening", () => {
    BOOTSTRAP_NODES.forEach(sendPing);
});

socket.bind(6881);
