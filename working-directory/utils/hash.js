import crypto from "crypto";

export function sha1(buffer) {
    return crypto.createHash("sha1").update(buffer).digest();
}
