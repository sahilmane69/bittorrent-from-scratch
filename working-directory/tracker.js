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

    const list = [];

    if (torrent[Buffer.from("announce")]) {
    }

            for (const url of tier) {
            }
        }
    }

    list.push(
        "http://tracker.opentrackr.org:1337/announce",
        "http://tracker.openbittorrent.com:80/announce"
    );

    return [...new Set(list)];
}


    }

        let url;
        try {
        } catch {
        }

        url.searchParams.append("uploaded", "0");
        url.searchParams.append("downloaded", "0");
        url.searchParams.append("left", totalSize.toString());
        url.searchParams.append("compact", "1");

        const client = url.protocol === "https:" ? https : http;

        client
            .get(url.toString(), res => {
                const chunks = [];
                res.on("end", () => {
                    const data = Buffer.concat(chunks);

                    if (data[0] !== 0x64) {
                    }

                    const response = bencode.decode(data);

                    if (response[Buffer.from("failure reason")]) {
                    }

}


        }
    }

