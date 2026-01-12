import fs from "fs";

export class PieceManager {
  constructor(pieceLength, totalLength) {
    this.pieceLength = pieceLength;
    this.totalLength = totalLength;
    this.blocks = {}; // Stores buffers: { pieceIndex: [ {begin, block}, ... ] }
    this.queue = []; // Array of {index, begin, length}
    this.received = []; // Bitfield of received pieces (boolean)
    this.requested = []; // Bitfield of requested blocks (simplified: just simple tracking)

    this.buildQueue();
  }

  buildQueue() {
    const nPieces = Math.ceil(this.totalLength / this.pieceLength);
    const BLOCK_SIZE = 16384;

    for (let i = 0; i < nPieces; i++) {
      const len = this.getPieceLength(i);
      const nBlocks = Math.ceil(len / BLOCK_SIZE);

      for (let j = 0; j < nBlocks; j++) {
        const begin = j * BLOCK_SIZE;
        const length = j === nBlocks - 1 ? len - begin : BLOCK_SIZE;
        this.queue.push({ index: i, begin, length });
      }
    }
    console.log(`Initialized queue with ${this.queue.length} blocks.`);
  }

  addBlock(index, begin, block) {
    if (!this.blocks[index]) {
      this.blocks[index] = [];
    }

    // Avoid duplicates?
    if (this.blocks[index].find((b) => b.begin === begin)) return false;

    this.blocks[index].push({ begin, block });

    const receivedBytes = this.blocks[index].reduce(
      (sum, b) => sum + b.block.length,
      0
    );
    const expectedBytes = this.getPieceLength(index);

    return receivedBytes >= expectedBytes;
  }

  getPiece(index) {
    if (!this.blocks[index]) return Buffer.alloc(0);
    const blocks = this.blocks[index];
    blocks.sort((a, b) => a.begin - b.begin);
    return Buffer.concat(blocks.map((b) => b.block));
  }

  getPieceLength(index) {
    const lastPieceIndex = Math.floor(this.totalLength / this.pieceLength);
    if (index === lastPieceIndex) {
      return this.totalLength % this.pieceLength || this.pieceLength;
    }
    return this.pieceLength;
  }

  getNeededBlock() {
    // Simple FIFO queue
    return this.queue.shift();
  }

  reset(index) {
    // Put blocks back in queue
    this.blocks[index] = [];
    // Re-generate queue items for this piece
    const len = this.getPieceLength(index);
    const BLOCK_SIZE = 16384;
    const nBlocks = Math.ceil(len / BLOCK_SIZE);
    for (let j = 0; j < nBlocks; j++) {
      const begin = j * BLOCK_SIZE;
      const length = j === nBlocks - 1 ? len - begin : BLOCK_SIZE;
      this.queue.push({ index, begin, length });
    }
  }

  writePiece(index, buffer) {
    const filename = "downloaded_file";
    let fd;
    try {
      fd = fs.openSync(filename, "r+");
    } catch (e) {
      if (e.code === "ENOENT") {
        // File missing, create it
        fd = fs.openSync(filename, "w+");
      } else {
        throw e;
      }
    }

    fs.writeSync(fd, buffer, 0, buffer.length, index * this.pieceLength);
    fs.closeSync(fd);

    this.markComplete(index);
  }

  markComplete(index) {
    this.received[index] = true;
    delete this.blocks[index]; // Free memory
    const pending = this.queue.length;
    const done = this.received.filter(Boolean).length;
    const total = Math.ceil(this.totalLength / this.pieceLength);
    console.log(`Progress: ${done}/${total} pieces. (Queue: ${pending})`);
  }

  // Check completion
  isDone() {
    const total = Math.ceil(this.totalLength / this.pieceLength);
    const done = this.received.filter(Boolean).length;
    return done === total;
  }
}
