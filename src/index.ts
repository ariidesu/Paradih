import fastify from "fastify";

import encryptionPlugin from "./common/plugins/encryption";
import authPlugin from "./common/plugins/auth";
import mongoosePlugin from "./common/plugins/mongoose";
import modelsPlugin from "./common/plugins/models";
import servicesPlugin from "./common/plugins/services";

import apiApp from "./plugins/api";
// import battleApp from "./plugins/battle";

async function main() {
    const apiInstance = fastify({ logger: true });
    await apiInstance.register(mongoosePlugin, { uri: process.env.MONGO_URI! });
    await apiInstance.register(modelsPlugin);
    await apiInstance.register(servicesPlugin);
    await apiInstance.register(encryptionPlugin, {
        aesKey: Buffer.from(process.env.AES_KEY!),
    });
    await apiInstance.register(authPlugin);
    apiInstance.register(apiApp);
    apiInstance.listen({
        port: parseInt(process.env.PORT || "") || 3000,
        host: "0.0.0.0",
    });

    // const battleInstance = fastify({ logger: true });
    // await battleInstance.register(mongoosePlugin, { uri: process.env.MONGO_URI! });
    // await battleInstance.register(modelsPlugin);
    // await battleInstance.register(servicesPlugin);
    // await battleInstance.register(encryptionPlugin, {
    //     aesKey: Buffer.from(process.env.BATTLE_AES_KEY!),
    // });
    // await battleInstance.register(authPlugin);
    // battleInstance.register(battleApp);
    // battleInstance.listen({
    //     port: parseInt(process.env.BATTLE_PORT || "") || 3001,
    //     host: "0.0.0.0",
    // });
}

main().catch(console.error);
