export class PieceManager {
    constructor(pieceLength, totalLength) {
        this.pieceLength = pieceLength;
        this.totalLength = totalLength;
        this.blocks = {};
    }

    addBlock(index, begin, block) {
        if (!this.blocks[index]) {
            this.blocks[index] = [];
        }

        this.blocks[index].push({ begin, block });

        const received = this.blocks[index].reduce((sum, b) => sum + b.block.length, 0);
        const expected = this.getPieceLength(index);

        console.log(`[PieceManager] index=${index} received=${received} expected=${expected}`);

        return received >= expected;
    }

    getPiece(index) {
        const blocks = this.blocks[index];
        blocks.sort((a, b) => a.begin - b.begin);
        return Buffer.concat(blocks.map(b => b.block));
    }

    getPieceLength(index) {
        const lastPieceIndex = Math.floor(this.totalLength / this.pieceLength);

        if (index === lastPieceIndex) {
            return this.totalLength % this.pieceLength || this.pieceLength;
        }

        return this.pieceLength;
    }

}
