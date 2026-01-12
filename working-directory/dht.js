import dgram from "dgram";
import crypto from "crypto";
import bencode from "bencode";

export class DHT {
  constructor(infoHash, onPeer) {
    this.socket = dgram.createSocket("udp4");
    this.infoHash = infoHash;
    this.onPeer = onPeer;
    this.nodeId = crypto.randomBytes(20);

    this.BOOTSTRAP_NODES = [
      { host: "router.bittorrent.com", port: 6881 },
      { host: "dht.transmissionbt.com", port: 6881 },
      { host: "router.utorrent.com", port: 6881 },
    ];
  }

  start() {
    this.socket.on("message", (msg, rinfo) => this.onMessage(msg, rinfo));
    this.socket.on("error", (err) => console.log("DHT Error:", err));

    this.socket.bind(0, () => {
      // console.log("DHT listening on port", this.socket.address().port);
      this.BOOTSTRAP_NODES.forEach((node) => this.sendPing(node));
      this.BOOTSTRAP_NODES.forEach((node) => this.getPeers(node));
    });
  }

  buildPing() {
    return bencode.encode({
      t: crypto.randomBytes(2),
      y: "q",
      q: "ping",
      a: { id: this.nodeId },
    });
  }

  sendPing(node) {
    const msg = this.buildPing();
    this.send(msg, node);
  }

  getPeers(node) {
    const msg = bencode.encode({
      t: crypto.randomBytes(2),
      y: "q",
      q: "get_peers",
      a: {
        id: this.nodeId,
        info_hash: this.infoHash,
      },
    });
    this.send(msg, node);
  }

  send(msg, node) {
    this.socket.send(msg, 0, msg.length, node.port, node.host, (err) => {
      // ignore
    });
  }

  onMessage(msg, rinfo) {
    try {
      const resp = bencode.decode(msg);

      if (resp.y && resp.y.toString() === "r") {
        if (resp.r.nodes) {
          const nodes = this.parseNodes(resp.r.nodes);
          // Query recursively?
          // For scratch logic: just ping/get_peers from them once or minimal traversal
          nodes.forEach((n) => this.getPeers({ host: n.ip, port: n.port }));
        }

        if (resp.r.values) {
          // Found peers!
          const peers = resp.r.values.map((v) => {
            return {
              ip: `${v[0]}.${v[1]}.${v[2]}.${v[3]}`,
              port: v.readUInt16BE(4),
            };
          });
          peers.forEach((p) => this.onPeer(p));
        }
      }
    } catch (e) {}
  }

  parseNodes(buf) {
    const nodes = [];
    for (let i = 0; i + 26 <= buf.length; i += 26) {
      // 20 bytes id + 6 bytes ip:port
      // minimal parsing
      const ip = `${buf[i + 20]}.${buf[i + 21]}.${buf[i + 22]}.${buf[i + 23]}`;
      const port = buf.readUInt16BE(i + 24);
      nodes.push({ ip, port });
    }
    return nodes;
  }
}
