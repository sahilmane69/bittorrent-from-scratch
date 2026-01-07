import net from "net";

const BLOCK_LENGTH = 16384;
const PIECE_LENGTH = 16384 * 2; // send 2 blocks = 32KB piece

const server = net.createServer(socket => {
    socket.on("data", data => {
        const pstrlen = data.readUInt8(0);
        const pstr = data.slice(1, 1 + pstrlen).toString();

        if (pstr === "BitTorrent protocol") {
            socket.write(data);

            const bitfield = Buffer.from([0, 0, 0, 2, 5, 0b11111111]);
            socket.write(bitfield);
            return;
        }

        if (data.length === 5 && data.readUInt8(4) === 2) {
            const unchoke = Buffer.from([0, 0, 0, 1, 1]);
            socket.write(unchoke);
            return;
        }

        if (data.length === 17 && data.readUInt8(4) === 6) {
            const index = data.readUInt32BE(5);
            const begin = data.readUInt32BE(9);
            const length = data.readUInt32BE(13);

            const payload = Buffer.alloc(8 + BLOCK_LENGTH);
            payload.writeUInt32BE(index, 0);
            payload.writeUInt32BE(begin, 4);
            payload.fill(1, 8);

            const message = Buffer.alloc(4 + 1 + payload.length);
            message.writeUInt32BE(1 + payload.length, 0);
            message.writeUInt8(7, 4);
            payload.copy(message, 5);

            socket.write(message);
            console.log(`Sent block at offset ${begin}`);

            // send second block automatically
            if (begin === 0) {
                const secondPayload = Buffer.alloc(8 + BLOCK_LENGTH);
                secondPayload.writeUInt32BE(index, 0);
                secondPayload.writeUInt32BE(BLOCK_LENGTH, 4);
                secondPayload.fill(1, 8);

                const secondMessage = Buffer.alloc(4 + 1 + secondPayload.length);
                secondMessage.writeUInt32BE(1 + secondPayload.length, 0);
                secondMessage.writeUInt8(7, 4);
                secondPayload.copy(secondMessage, 5);

                socket.write(secondMessage);
                console.log(`Sent block at offset ${BLOCK_LENGTH}`);
            }
        }
    });
});

server.listen(6881, () => {
    console.log("Mock peer listening on port 6881");
});
