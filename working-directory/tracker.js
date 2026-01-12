import bencode from "bencode";
import http from "http";
import https from "https";
import dgram from "dgram";
import crypto from "crypto";
import { parseCompactPeers } from "./utils/peers.js";

export function getPeers(torrent, peerId) {
  return new Promise(async (resolve, reject) => {
    const trackers = getTrackers(torrent);
    // Backup trackers
    trackers.push(
      "udp://tracker.opentrackr.org:1337/announce",
      "http://tracker.opentrackr.org:1337/announce",
      "udp://9.rarbg.com:2810/announce",
      "udp://tracker.openbittorrent.com:80/announce"
    );

    const uniqueParams = [...new Set(trackers)];
    const peers = [];
    const seen = new Set();

    // Split trackers by protocol
    const promises = uniqueParams.map((url) => {
      if (url.startsWith("http")) return httpRequest(url, torrent, peerId);
      if (url.startsWith("udp")) return udpRequest(url, torrent, peerId);
      return Promise.resolve([]);
    });

    const results = await Promise.allSettled(promises);

    results.forEach((res) => {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        res.value.forEach((p) => {
          const key = `${p.ip}:${p.port}`;
          if (!seen.has(key)) {
            seen.add(key);
            peers.push(p);
          }
        });
      }
    });

    if (peers.length > 0) resolve(peers);
    else reject(new Error("No peers found from any tracker"));
  });
}

function getTrackers(torrent) {
  const list = [];
  if (torrent.announce) list.push(torrent.announce);
  if (torrent.announceList) {
    torrent.announceList.forEach((tier) => {
      tier.forEach((url) => list.push(url.toString("utf8")));
    });
  }
  return list;
}

function httpRequest(url, torrent, peerId) {
  return new Promise((resolve) => {
    const encodedInfoHash = percentEncode(torrent.infoHash);
    const encodedPeerId = percentEncode(peerId);

    const query = `?info_hash=${encodedInfoHash}&peer_id=${encodedPeerId}&port=6881&uploaded=0&downloaded=0&left=${torrent.size}&compact=1&event=started`;
    const fullUrl = url + query;
    const client = url.startsWith("https") ? https : http;

    const req = client.get(fullUrl, (res) => {
      const chunks = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => {
        try {
          const resp = bencode.decode(Buffer.concat(chunks));
          if (resp[Buffer.from("peers")]) {
            resolve(parseCompactPeers(resp[Buffer.from("peers")]));
          } else {
            resolve([]);
          }
        } catch {
          resolve([]);
        }
      });
    });
    req.on("error", () => resolve([]));
    req.setTimeout(2000, () => req.destroy());
  });
}

function udpRequest(urlStr, torrent, peerId) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    let url;
    try {
      url = new URL(urlStr);
    } catch {
      return resolve([]);
    }

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      try {
        socket.close();
      } catch (e) {}
    };

    // 1. Connect
    const req = Buffer.alloc(16);
    req.writeBigUInt64BE(0x41727101980n, 0); // Protocol ID
    req.writeUInt32BE(0, 8); // Action: Connect
    const transId = crypto.randomBytes(4);
    transId.copy(req, 12);

    socket.send(req, url.port, url.hostname, (err) => {
      if (err) {
        cleanup();
        resolve([]);
      }
    });

    socket.on("message", (msg) => {
      if (done) return;
      if (msg.length < 16) return;
      const action = msg.readUInt32BE(0);
      const tid = msg.slice(4, 8);
      if (!tid.equals(transId)) return;

      if (action === 0) {
        // Connected
        const connId = msg.slice(8, 16);
        // 2. Announce
        const ann = Buffer.alloc(98);
        connId.copy(ann, 0);
        ann.writeUInt32BE(1, 8); // Action: Announce
        transId.copy(ann, 12);
        torrent.infoHash.copy(ann, 16);
        peerId.copy(ann, 36);
        ann.writeBigUInt64BE(BigInt(0), 56);
        ann.writeBigUInt64BE(BigInt(torrent.size), 64);
        ann.writeBigUInt64BE(BigInt(0), 72);
        ann.writeUInt32BE(0, 80); // Event: None
        ann.writeUInt32BE(0, 84); // IP
        ann.writeUInt32BE(crypto.randomInt(0, 0xffffffff), 88);
        ann.writeInt32BE(-1, 92);
        ann.writeUInt16BE(6881, 96);

        socket.send(ann, url.port, url.hostname);
      } else if (action === 1) {
        // Announce response
        const peers = parseCompactPeers(msg.slice(20));
        cleanup();
        resolve(peers);
      }
    });

    setTimeout(() => {
      cleanup();
      resolve([]);
    }, 2000);
  });
}

function percentEncode(buffer) {
  let result = "";
  for (const byte of buffer) {
    result += "%" + byte.toString(16).padStart(2, "0");
  }
  return result;
}
