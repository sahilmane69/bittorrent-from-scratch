import fs from "fs";
import bencode from "bencode";
import crypto from "crypto";
import http from "http";
import https from "https";
import { URL } from "url";

const torrent = bencode.decode(fs.readFileSync("./sample.torrent"));
const info = torrent[Buffer.from("info")];

const infoHash = crypto
    .createHash("sha1")
    .update(bencode.encode(info))
    .digest();

const peerId = Buffer.from(
    "-SM0001-" + crypto.randomBytes(12).toString("hex")
).slice(0, 20);

let totalSize = 0;
if (info[Buffer.from("files")]) {
    for (const f of info[Buffer.from("files")]) {
        totalSize += f[Buffer.from("length")];
    }
} else {
    totalSize = info[Buffer.from("length")];
}

function getTrackers(torrent) {
    const list = [];

    if (torrent[Buffer.from("announce")]) {
        list.push(Buffer.from(torrent[Buffer.from("announce")]).toString("utf8"));
    }

    const al = torrent[Buffer.from("announce-list")];
    if (al) {
        for (const tier of al) {
            for (const url of tier) {
                list.push(Buffer.from(url).toString("utf8"));
            }
        }
    }

    list.push(
        "http://tracker.opentrackr.org:1337/announce",
        "http://tracker.openbittorrent.com:80/announce"
    );

    return [...new Set(list)];
}

const trackers = getTrackers(torrent);

function tryTracker(i) {
    if (i >= trackers.length) {
        console.log("All trackers failed");
        return;
    }

    let url;
    try {
        url = new URL(trackers[i]);
    } catch {
        tryTracker(i + 1);
        return;
    }

    url.searchParams.append("info_hash", infoHash.toString("binary"));
    url.searchParams.append("peer_id", peerId.toString("binary"));
    url.searchParams.append("port", "6881");
    url.searchParams.append("uploaded", "0");
    url.searchParams.append("downloaded", "0");
    url.searchParams.append("left", totalSize.toString());
    url.searchParams.append("compact", "1");

    const client = url.protocol === "https:" ? https : http;

    client
        .get(url.toString(), res => {
            const chunks = [];
            res.on("data", c => chunks.push(c));
            res.on("end", () => {
                const data = Buffer.concat(chunks);

                if (data[0] !== 0x64) {
                    tryTracker(i + 1);
                    return;
                }

                const response = bencode.decode(data);

                if (response[Buffer.from("failure reason")]) {
                    tryTracker(i + 1);
                    return;
                }

                const peersRaw = response[Buffer.from("peers")];
                if (!peersRaw) {
                    tryTracker(i + 1);
                    return;
                }

                const peers = Buffer.from(peersRaw);
                console.log("Peers:", peers.length / 6);

                for (let j = 0; j < peers.length; j += 6) {
                    const ip = `${peers[j]}.${peers[j+1]}.${peers[j+2]}.${peers[j+3]}`;
                    const port = peers.readUInt16BE(j + 4);
                    console.log(ip, port);
                }
            });
        })
        .on("error", () => tryTracker(i + 1));
}

tryTracker(0);
