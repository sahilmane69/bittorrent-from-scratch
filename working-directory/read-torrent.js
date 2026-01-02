// const fs = require("fs");
//
// const torrent = fs.readFileSync("sample.torrent");
// console.log(torrent);
// const fs = require("fs");
//
// const torrent = fs.readFileSync("sample.torrent");
// console.log(torrent.toString());

// const fs = require("fs");
//
// const torrent = fs.readFileSync("sample.torrent");
// // console.log("Torrent file loaded. Size:", torrent.length, "bytes");
// console.log({
//     announce: torrent.announce,
//     name: torrent.info.name,
//     pieceLength: torrent.info['piece length'],
//     totalPieces: torrent.info.pieces.length / 20
// });



//------------------------------------------------------------------------------------------------

import fs from "fs";
import bencode from "bencode";
import crypto from "crypto";

const torrentFile = fs.readFileSync("./sample.torrent");
const torrent = bencode.decode(torrentFile);

// Correct access using Buffers
const info = torrent[Buffer.from("info")];

const name = Buffer.from(info[Buffer.from("name")]).toString("utf8");

const pieceLength = info[Buffer.from("piece length")];
const pieces = info[Buffer.from("pieces")];

console.log({
    name,
    pieceLength,
    totalPieces: pieces.length / 20
});

// Generate info hash
const infoEncoded = bencode.encode(info);
const infoHash = crypto.createHash("sha1").update(infoEncoded).digest("hex");

console.log("Info Hash:", infoHash);


