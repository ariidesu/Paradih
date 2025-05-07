import { Readable } from "stream";
import fp from "fastify-plugin";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

declare module "fastify" {
    interface FastifyContextConfig {
        encrypted?: boolean;
    }
}

const encrypt = function (payload: string, key: Buffer): Buffer {
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-128-cbc", key, iv);

    return Buffer.concat([iv, cipher.update(payload, "utf-8"), cipher.final()]);
};

const decrypt = function (payload: Buffer, key: Buffer): string {
    try {
        const iv = payload.subarray(0, 16);
        const encrypted = payload.subarray(16);
        const decipher = createDecipheriv("aes-128-cbc", key, iv);

        let decrypted = decipher.update(encrypted, undefined, "utf-8");
        decrypted += decipher.final("utf-8");
        return decrypted;
    } catch(e) {
        return payload.toString("utf-8");
    }
};

export default fp<{ aesKey: Buffer }>(async (fastify, opts) => {
    const AES_KEY: Buffer = opts.aesKey;

    fastify.addContentTypeParser("application/octet-stream", { parseAs: "buffer" }, (request, body, done) => {
        if (request.routeOptions.config?.encrypted) {
            const decrypted = decrypt(body as Buffer, AES_KEY)

            done(null, JSON.parse(decrypted));
        } else {
            done(null, body);
        }
    });

    fastify.addHook("onSend", async (request, reply, payload) => {
        if (request.routeOptions.config?.encrypted) {
            try {
                let stringPayload: string;
                if (Buffer.isBuffer(payload)) {
                    stringPayload = payload.toString("utf8");
                } else if (typeof payload !== "string") {
                    stringPayload = JSON.stringify(payload);
                } else stringPayload = payload as string;

                return encrypt(stringPayload, AES_KEY);
            } catch (e) {}
        }
        return payload;
    });
});
