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
    const msg = buildPing();
    socket.send(msg, 0, msg.length, node.port, node.host, err => {
        if (err) console.log("SEND ERROR", err);
        else console.log("PING SENT ->", node.host);
    });
}

socket.on("message", (msg, rinfo) => {
    try {
        const data = bencode.decode(msg);
        console.log("RESPONSE FROM", rinfo.address, data);
    } catch (e) {
        console.log("DECODE ERROR", e);
    }
});

socket.on("error", err => {
    console.log("SOCKET ERROR", err);
});

socket.on("listening", () => {
    const address = socket.address();
    console.log("DHT node listening on", address);
    BOOTSTRAP_NODES.forEach(sendPing);
});

socket.bind(0);
