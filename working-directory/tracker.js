// tracker.js

import fs from "fs";
import bencode from "bencode";
import crypto from "crypto";
import http from "http";
import https from "https";
import { URL } from "url";

/* =======================
   LOAD & PARSE TORRENT
======================= */

const torrent = bencode.decode(fs.readFileSync("./sample.torrent"));
const info = torrent[Buffer.from("info")];

/* =======================
   INFO HASH (20 bytes)
======================= */

const infoHash = crypto
    .createHash("sha1")
    .update(bencode.encode(info))
    .digest();

/* =======================
   PEER ID (20 bytes)
======================= */

const peerId = Buffer.from(
    "-SM0001-" + crypto.randomBytes(12).toString("hex")
).slice(0, 20);

/* =======================
   TOTAL SIZE
======================= */

let totalSize = 0;

if (info[Buffer.from("files")]) {
    for (const f of info[Buffer.from("files")]) {
        totalSize += f[Buffer.from("length")];
    }
} else {
    totalSize = info[Buffer.from("length")];
}

/* =======================
   TRACKER LIST
======================= */
function urlEncodeBytes(buffer) {
    let encoded = "";
    for (const byte of buffer) {
        encoded += "%" + byte.toString(16).padStart(2, "0");
    }
    return encoded;
}


function getTrackers() {
    const list = [];

    if (torrent[Buffer.from("announce")]) {
        list.push(torrent[Buffer.from("announce")].toString("utf8"));
    }

    const announceList = torrent[Buffer.from("announce-list")];
    if (announceList) {
        for (const tier of announceList) {
            for (const url of tier) {
                list.push(url.toString("utf8"));
            }
        }
    }

    // fallback trackers
    list.push(
        "http://tracker.opentrackr.org:1337/announce",
        "http://tracker.openbittorrent.com:80/announce"
    );

    return [...new Set(list)];
}

function decodeTrackerUrl(trackerUrl) {
    // If it already looks like a URL, return as-is
    if (trackerUrl.startsWith("http")) {
        return trackerUrl;
    }

    // If it's a numeric ASCII string like "104,116,116,..."
    if (/^\d+(,\d+)+$/.test(trackerUrl)) {
        return trackerUrl
            .split(",")
            .map(n => String.fromCharCode(Number(n)))
            .join("");
    }

    return trackerUrl;
}


function requestTracker(trackerUrl) {
    console.log("DEBUG trackerUrl type:", typeof trackerUrl);
    console.log("DEBUG trackerUrl value:", trackerUrl);

    return new Promise((resolve, reject) => {
        let url;

        try {
            const decodedUrl = decodeTrackerUrl(trackerUrl);
            url = new URL(decodedUrl);

        } catch {
            return reject("Invalid tracker URL");
        }

        url.search = "";
        url.search += "?info_hash=" + urlEncodeBytes(infoHash);
        url.search += "&peer_id=" + urlEncodeBytes(peerId);
        url.search += "&port=6881";
        url.search += "&uploaded=0";
        url.search += "&downloaded=0";
        url.search += "&left=" + totalSize;
        url.search += "&compact=1";


        url.searchParams.append("uploaded", "0");
        url.searchParams.append("downloaded", "0");
        url.searchParams.append("left", totalSize.toString());
        url.searchParams.append("compact", "1");

        const client = url.protocol === "https:" ? https : http;

        client
            .get(url.toString(), res => {
                const chunks = [];

                res.on("data", chunk => chunks.push(chunk));
                res.on("end", () => {
                    const data = Buffer.concat(chunks);

                    if (data[0] !== 0x64) {
                        return reject("Invalid tracker response");
                    }

                    const response = bencode.decode(data);

                    if (response[Buffer.from("failure reason")]) {
                        return reject("Tracker failure");
                    }

                    const peers = response[Buffer.from("peers")];
                    if (!peers) {
                        return reject("No peers in response");
                    }
                    console.log("Tracker responded OK:", url.href);

                    resolve(Buffer.from(peers));
                });
            })
            .on("error", err => reject(err.message));
    });
}

/* =======================
   PUBLIC API (IMPORTANT)
======================= */

export async function getTrackerResponse() {
    const trackers = getTrackers();

    for (let i = 0; i < trackers.length; i++) {
        try {
            const peers = await requestTracker(trackers[i]);
            console.log(`Tracker success: ${trackers[i]}`);
            console.log(`Peers found: ${peers.length / 6}`);

            return {
                peers,      // Buffer (compact format)
                infoHash    // Buffer (20 bytes)
            };
        } catch (err) {
            console.log(`Tracker failed: ${trackers[i]}`);
        }
    }

    throw new Error("All trackers failed");
}
