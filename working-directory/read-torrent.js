// const fs = require("fs");
//
// const torrent = fs.readFileSync("sample.torrent");
// console.log(torrent);
// const fs = require("fs");
//
// const torrent = fs.readFileSync("sample.torrent");
// console.log(torrent.toString());

const fs = require("fs");

const torrent = fs.readFileSync("sample.torrent");
console.log("Torrent file loaded. Size:", torrent.length, "bytes");


