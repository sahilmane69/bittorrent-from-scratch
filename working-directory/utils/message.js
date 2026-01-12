export function parseMessage(buffer) {
  const length = buffer.readUInt32BE(0);

  if (length === 0) {
    return { type: "keep-alive" };
  }

  const id = buffer.readUInt8(4);
  // paylod length is length - 1 (for id)
  // we must ensure we don't return buffer of next message
  const payload = buffer.slice(5, 4 + length);

  return { length, id, payload };
}

export const MESSAGE_TYPES = {
  0: "choke",
  1: "unchoke",
  2: "interested",
  3: "not-interested",
  4: "have",
  5: "bitfield",
  6: "request",
  7: "piece",
  8: "cancel",
  9: "port",
};
