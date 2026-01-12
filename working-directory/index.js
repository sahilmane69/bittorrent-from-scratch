import process from "process";
import crypto from "crypto";
import { getTorrent } from "./read-torrent.js";
import { getPeers } from "./tracker.js";
import { DHT } from "./dht.js";
import { Peer } from "./peer.js";
import { PieceManager } from "./utils/pieceManager.js";

const torrentPath = process.argv[2];
if (!torrentPath) {
  console.log("Usage: node index.js <path-to-torrent>");
  process.exit(1);
}

const torrent = getTorrent(torrentPath);
const myPeerId = Buffer.concat([
  Buffer.from("-SM0001-"),
  crypto.randomBytes(12),
]);
torrent.peerId = myPeerId; // attach for convenience

console.log(`Starting download: ${torrent.name}`);
console.log(`Info Hash: ${torrent.infoHash.toString("hex")}`);

const pieceManager = new PieceManager(torrent.pieceLength, torrent.size);
const activePeers = new Set(); // Strings "ip:port"

function connectToPeer(peerInfo) {
  const key = `${peerInfo.ip}:${peerInfo.port}`;
  if (activePeers.has(key)) return;

  activePeers.add(key);
  // console.log(`Connecting to ${key}`);

  const peer = new Peer(peerInfo, torrent, pieceManager, torrent.pieces);
  peer.connect();

  peer.socket.on("close", () => {
    activePeers.delete(key);
  });
}

// 1. Tracker Discovery
// 1. Tracker Discovery
getPeers(torrent, myPeerId)
  .then((peers) => {
    console.log(`Tracker returned ${peers.length} peers.`);
    peers.forEach(connectToPeer);

    if (peers.length === 0) {
      console.log("No peers from tracker. Relying on DHT...");
    }
  })
  .catch((err) => {
    console.log(`Tracker error: ${err.message}`);
    console.log("Tracker failed. Relying on DHT...");
  });

// 2. DHT Discovery
const dht = new DHT(torrent.infoHash, (peerInfo) => {
  // console.log(`DHT found peer: ${peerInfo.ip}:${peerInfo.port}`);
  connectToPeer(peerInfo);
});
dht.start();

// 3. Status Loop
setInterval(() => {
  const done = pieceManager.received.filter(Boolean).length; // Wait, received is not updated in PieceManager proper?
  // PieceManager needs to track `received` count better if we want stats.
  // But `isDone()` works.

  if (pieceManager.isDone()) {
    console.log("\nDownload Complete!");
    process.exit(0);
  }
}, 5000);
