import fs from "fs";
import bencode from "bencode";
import crypto from "crypto";
import http from "http";
import https from "https";

const torrent = bencode.decode(fs.readFileSync("./sample.torrent"));
const info = torrent[Buffer.from("info")];

const infoHash = crypto.createHash("sha1").update(bencode.encode(info)).digest();

const peerId = Buffer.concat([
    Buffer.from("-SM0001-"),
    crypto.randomBytes(12)
]);

let totalSize = 0;
if (info[Buffer.from("files")]) {
    for (const file of info[Buffer.from("files")]) {
        totalSize += file[Buffer.from("length")];
    }
} else {
    totalSize = info[Buffer.from("length")];
}

function decodeBuffer(buf) {
    return Buffer.from(buf).toString("utf8");
}

function getTrackers() {
    const list = [];

    if (torrent[Buffer.from("announce")]) {
        list.push(decodeBuffer(torrent[Buffer.from("announce")]));
    }

    if (torrent[Buffer.from("announce-list")]) {
        const tiers = torrent[Buffer.from("announce-list")];
        for (const tier of tiers) {
            for (const url of tier) {
                list.push(decodeBuffer(url));
            }
        }
    }

    list.push(
        "http://tracker.openbittorrent.com:80/announce",
        "http://tracker.bt4g.com:2095/announce",
        "http://tracker.bittorrent.am:80/announce"
    );

    return [...new Set(list)].filter(u => u.startsWith("http"));
}

function percentEncode(buffer) {
    let result = "";
    for (const byte of buffer) {
        result += "%" + byte.toString(16).padStart(2, "0");
    }
    return result;
}

function parsePeers(peersBuffer) {
    const peers = [];
    for (let i = 0; i < peersBuffer.length; i += 6) {
        const ip = `${peersBuffer[i]}.${peersBuffer[i + 1]}.${peersBuffer[i + 2]}.${peersBuffer[i + 3]}`;
        const port = peersBuffer.readUInt16BE(i + 4);
        peers.push({ ip, port });
    }
    return peers;
}

function getPeersFromTracker() {
    return new Promise((resolve, reject) => {
        const trackers = getTrackers();
        let completed = false;

        trackers.forEach(trackerUrl => {
            const encodedInfoHash = percentEncode(infoHash);
            const encodedPeerId = percentEncode(peerId);

            const query =
                `?info_hash=${encodedInfoHash}` +
                `&peer_id=${encodedPeerId}` +
                `&port=6881` +
                `&uploaded=0` +
                `&downloaded=0` +
                `&left=${totalSize}` +
                `&compact=1` +
                `&event=started` +
                `&numwant=50`;

            const fullUrl = trackerUrl + query;
            const client = fullUrl.startsWith("https") ? https : http;

            client.get(fullUrl, res => {
                const chunks = [];

                res.on("data", chunk => chunks.push(chunk));

                res.on("end", () => {
                    try {
                        const data = Buffer.concat(chunks);
                        const response = bencode.decode(data);

                        if (response[Buffer.from("failure reason")]) return;

                        const peersBuffer = response[Buffer.from("peers")];
                        const peers = parsePeers(peersBuffer);

                        if (!completed && peers.length > 0) {
                            completed = true;
                            resolve(peers);
                        }
                    } catch {}
                });
            }).on("error", () => {});
        });

        setTimeout(() => {
            if (!completed) reject("All trackers failed");
        }, 8000);
    });
}

getPeersFromTracker()
    .then(peers => {
        console.log("PEERS:", peers);
    })
    .catch(err => {
        console.log(err);
    });
