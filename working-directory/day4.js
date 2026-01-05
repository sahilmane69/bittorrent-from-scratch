// day4.js

import { parseCompactPeers } from "./utils/peers.js";
import { connectToPeer } from "./peer.js";

// Example: tracker response object
// trackerResponse.peers MUST be a Buffer
// infoHash MUST be a 20-byte Buffer

import { getTrackerResponse } from "./tracker.js"; // your existing tracker logic

const { peers: peersBuffer, infoHash } = await getTrackerResponse();

const peers = parseCompactPeers(peersBuffer);

if (peers.length === 0) {
    console.log("No peers found");
    process.exit(0);
}

// IMPORTANT: connect to only ONE peer
connectToPeer(peers[0], infoHash);

