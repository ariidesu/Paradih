import { Readable } from "stream";
import fp from "fastify-plugin";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

declare module "fastify" {
    interface FastifyInstance {
        encryptPara: (payload: string) => Buffer;
        decryptPara: (payload: Buffer) => string;
    }
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

    fastify.decorate("encryptPara", function(payload: string) {
        return encrypt(payload, AES_KEY);
    });
    fastify.decorate("decryptPara", function(payload: Buffer) {
        return decrypt(payload, AES_KEY);
    });

    fastify.addContentTypeParser("application/octet-stream", { parseAs: "buffer" }, (request, body, done) => {
        if (request.routeOptions.config?.encrypted) {
            const decrypted = decrypt(body as Buffer, AES_KEY)

            done(null, JSON.parse(decrypted));
        } else {
            done(null, body);
        }
    });

    fastify.addHook("onSend", async (request, reply, payload) => {
        reply.header("cache-control", "private, no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0, no-transform");
        reply.header("pragma", "no-cache");
        reply.header("expires", "0");
        reply.header("surrogate-control", "no-store");

        if (request.routeOptions.config?.encrypted) {
            let stringPayload: string;
            if (Buffer.isBuffer(payload)) {
                stringPayload = payload.toString("utf8");
            } else if (typeof payload !== "string") {
                stringPayload = JSON.stringify(payload);
            } else stringPayload = payload as string;

            const encryptedPayload = encrypt(stringPayload, AES_KEY);
            reply.removeHeader("content-encoding");
            reply.removeHeader("content-length");
            return encryptedPayload;
        }
        return payload;
    });
});
