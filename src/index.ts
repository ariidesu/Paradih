import fastify from "fastify";
import fastifyEnv from "@fastify/env";

import encryptionPlugin from "./common/plugins/encryption";
import authPlugin from "./common/plugins/auth";
import mongoosePlugin from "./common/plugins/mongoose";
import modelsPlugin from "./common/plugins/models";
import servicesPlugin from "./common/plugins/services";

import apiApp from "./plugins/api";
// import battleApp from "./plugins/battle";

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: number,
      AES_KEY: string,
      MONGODB_URI: string,
      JWT_SECRET: string,

      CONFIG_DEFAULT_AC: number,
      CONFIG_DEFAULT_DP: number,
      CONFIG_DEFAULT_NAVI: number,
    };
  }
}
const ENV_SCHEMA = {
  type: 'object',
  required: [ "PORT", "AES_KEY", "MONGODB_URI", "JWT_SECRET" ],
  properties: {
    PORT: {
      type: 'number',
      default: 3000
    },
    AES_KEY: {
      type: "string",
    },
    MONGODB_URI: {
      type: "string"
    },
    JWT_SECRET: {
      type: "string"
    },
    
    CONFIG_DEFAULT_AC: {
      type: "number",
      default: 0
    },
    CONFIG_DEFAULT_DP: {
      type: "number",
      default: 0
    },
    CONFIG_DEFAULT_NAVI: {
      type: "number",
      default: 0
    },
  }
}

async function main() {
    const apiInstance = fastify({ logger: true });
    apiInstance.addHook('preHandler', (request, reply, done) => {
      request.log.info({ url: request.raw.url, method: request.raw.method }, `received ${typeof request.body == "object" ? JSON.stringify(request.body) : request.body}`)
      done()
    })
    apiInstance.addHook('onSend', (request, reply, payload, done) => {
      request.log.info({ url: request.raw.url, method: request.raw.method }, `sending ${payload}`)
      done()
    })

    await apiInstance.register(fastifyEnv, { dotenv: true, schema: ENV_SCHEMA });
    await apiInstance.register(mongoosePlugin, { uri: apiInstance.config.MONGODB_URI });
    await apiInstance.register(modelsPlugin);
    await apiInstance.register(servicesPlugin);
    await apiInstance.register(encryptionPlugin, {
        aesKey: Buffer.from(apiInstance.config.AES_KEY),
    });
    await apiInstance.register(authPlugin);
    apiInstance.register(apiApp);
    apiInstance.listen({
        port: apiInstance.config.PORT,
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
