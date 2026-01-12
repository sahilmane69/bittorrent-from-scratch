import fs from "fs";
import bencode from "bencode";
import crypto from "crypto";

export function getTorrent(path) {
  const torrent = bencode.decode(fs.readFileSync(path));
  const info = torrent[Buffer.from("info")];

  // Calculate size
  let size = 0;
  if (info[Buffer.from("files")]) {
    for (const file of info[Buffer.from("files")]) {
      size += file[Buffer.from("length")];
    }
  } else {
    size = info[Buffer.from("length")];
  }

  const infoHash = crypto
    .createHash("sha1")
    .update(bencode.encode(info))
    .digest();

  return {
    announce: torrent[Buffer.from("announce")]
      ? torrent[Buffer.from("announce")].toString()
      : null,
    announceList: torrent[Buffer.from("announce-list")],
    info,
    infoHash,
    size,
    pieceLength: info[Buffer.from("piece length")],
    pieces: info[Buffer.from("pieces")],
    name: Buffer.from(info[Buffer.from("name")]).toString("utf8"),
  };
}
