import fp from "fastify-plugin";
import mongoose from "mongoose";
import { FastifyInstance } from "fastify";

declare module "fastify" {
    interface FastifyInstance {
        mongoose: typeof mongoose;
    }
}

export default fp<{ uri: string }>(async (fastify: FastifyInstance, opts) => {
    await mongoose.connect(opts.uri);
    fastify.decorate("mongoose", mongoose);

    fastify.addHook("onClose", async () => {
        await mongoose.disconnect();
    });
});
