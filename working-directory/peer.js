import net from "net";
import crypto from "crypto";
import fs from "fs";
import bencode from "bencode";
import { buildHandshake } from "./utils/handshake.js";
import { parseMessage, MESSAGE_TYPES } from "./utils/message.js";
import { buildInterested } from "./utils/builder.js";
import { buildRequest } from "./utils/request.js";
import { PieceManager } from "./utils/pieceManager.js";
import { sha1 } from "./utils/hash.js";

const torrent = bencode.decode(fs.readFileSync("./sample.torrent"));
const info = torrent[Buffer.from("info")];

const infoHash = crypto
    .createHash("sha1")
    .update(bencode.encode(info))
    .digest();

const peerId = Buffer.from("-SM0001-" + crypto.randomBytes(12).toString("hex")).slice(0, 20);

const pieceLength = info[Buffer.from("piece length")];
const totalLength = info[Buffer.from("length")];
const pieces = info[Buffer.from("pieces")];

const pieceManager = new PieceManager(pieceLength, totalLength);

const peer = {
    ip: "127.0.0.1", // later: real peer from tracker
    port: 6881
};

const BLOCK_LENGTH = 16384;
const socket = new net.Socket();

socket.connect(peer.port, peer.ip, () => {
    console.log(`Connected to peer ${peer.ip}:${peer.port}`);
    socket.write(buildHandshake(infoHash, peerId));
    console.log("Handshake sent");
});

socket.on("data", data => {
    if (data.length === 68) {
        console.log("Handshake received");
        return;
    }

    const message = parseMessage(data);
    if (!message || message.type === "keep-alive") return;

    const type = MESSAGE_TYPES[message.id];

    if (type === "bitfield") {
        socket.write(buildInterested());
        console.log("Interested sent");
    }

    if (type === "unchoke") {
        console.log("Unchoked – requesting piece 0");
        socket.write(buildRequest(0, 0, BLOCK_LENGTH));
    }

    if (type === "piece") {
        const index = message.payload.readUInt32BE(0);
        const begin = message.payload.readUInt32BE(4);
        const block = message.payload.slice(8);

        const completed = pieceManager.addBlock(index, begin, block);
        console.log(`Received block ${begin} length ${block.length}`);

        if (completed) {
            const piece = pieceManager.getPiece(index);
            const hash = sha1(piece);
            const expected = pieces.slice(index * 20, index * 20 + 20);

            if (hash.equals(expected)) {
                fs.writeFileSync(`piece_${index}.bin`, piece);
                console.log(`Piece ${index} verified & written to disk`);
            } else {
                console.log(`Piece ${index} failed hash check – discarded`);
            }
        }
    }
});

socket.on("error", err => {
    console.error("Socket error:", err.message);
});
