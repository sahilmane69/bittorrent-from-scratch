import net from "net";
import { buildHandshake } from "./utils/handshake.js";
import { parseMessage, MESSAGE_TYPES } from "./utils/message.js";
import { buildInterested } from "./utils/builder.js";
import { buildRequest } from "./utils/request.js";
import { sha1 } from "./utils/hash.js";

export class Peer {
  constructor(peer, torrent, pieceManager, pieces) {
    this.ip = peer.ip;
    this.port = peer.port;
    this.torrent = torrent; // { infoHash, peerId, ... }
    this.pieceManager = pieceManager;
    this.pieces = pieces; // The raw pieces buffer from torrent info

    this.socket = new net.Socket();
    this.choked = true;
    this.handshakeComplete = false;
    this.queue = []; // internal queue
    this.bitfield = null;
    this.buffer = Buffer.alloc(0);
  }

  connect() {
    this.socket.connect(this.port, this.ip, () => {
      console.log(`Connected to ${this.ip}:${this.port}`);
      this.socket.write(
        buildHandshake(this.torrent.infoHash, this.torrent.peerId)
      );
    });

    this.socket.on("data", (data) => {
      // console.log(`RX ${data.length} from ${this.ip}`);
      this.buffer = Buffer.concat([this.buffer, data]);
      this.processBuffer();
    });
    this.socket.on("error", (err) => {
      // console.log(`Error with ${this.ip}: ${err.message}`);
      this.socket.destroy();
    });
    this.socket.on("end", () => {
      // console.log(`Connection closed by ${this.ip}`);
    });
  }

  processBuffer() {
    // 1. Handshake
    if (!this.handshakeComplete) {
      if (this.buffer.length >= 68) {
        // We could verify protocol string here
        this.handshakeComplete = true;
        this.buffer = this.buffer.slice(68);
        this.socket.write(buildInterested());
        // Continue processing
      } else {
        return; // Wait for more data
      }
    }

    // 2. Messages
    while (this.buffer.length > 4) {
      const len = this.buffer.readUInt32BE(0);
      if (len === 0) {
        // Keep-alive
        this.buffer = this.buffer.slice(4);
        continue;
      }

      if (this.buffer.length >= 4 + len) {
        const msgBuffer = this.buffer.slice(0, 4 + len);
        this.buffer = this.buffer.slice(4 + len);

        const message = parseMessage(msgBuffer);
        if (message) this.handleMessage(message);
      } else {
        break; // Wait for more data
      }
    }
  }

  handleMessage(message) {
    const type = MESSAGE_TYPES[message.id];

    if (type === "unchoke") {
      console.log(`Unchoked by ${this.ip}`);
      this.choked = false;
      this.requestPiece();
    } else if (type === "piece") {
      const size = message.payload.length - 8;
      console.log(`Piece from ${this.ip} size ${size}`);
      this.handlePiece(message.payload);
    } else if (type === "have") {
      // console.log(`Have from ${this.ip}`);
      // update bitfield in real app
    } else if (type === "bitfield") {
      // console.log(`Bitfield from ${this.ip}`);
      // set bitfield
    }
  }

  requestPiece() {
    if (this.choked) return;

    // Ask PieceManager what we need
    // This requires PieceManager to manage state globally or we ask for specific piece.
    // For simplicity, let's ask PieceManager for a block we can download.
    // We'll need to extend PieceManager to support "get needed block".

    const block = this.pieceManager.getNeededBlock();
    if (block) {
      this.socket.write(buildRequest(block.index, block.begin, block.length));
    }
  }

  handlePiece(payload) {
    const index = payload.readUInt32BE(0);
    const begin = payload.readUInt32BE(4);
    const block = payload.slice(8);

    const done = this.pieceManager.addBlock(index, begin, block);

    if (done) {
      // Verify
      const piece = this.pieceManager.getPiece(index);
      const expected = this.pieces.slice(index * 20, index * 20 + 20);
      if (sha1(piece).equals(expected)) {
        console.log(`Piece ${index} VERIFIED`);
        this.pieceManager.writePiece(index, piece);
      } else {
        console.log(`Piece ${index} FAILED`);
        this.pieceManager.reset(index);
      }
    }

    this.requestPiece(); // Pipeline
  }
}
