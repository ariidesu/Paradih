import fastify from "fastify";
import fastifyEnv from "@fastify/env";

import encryptionPlugin from "./common/plugins/encryption";
import authPlugin from "./common/plugins/auth";
import mongoosePlugin from "./common/plugins/mongoose";
import modelsPlugin from "./common/plugins/models";
import servicesPlugin from "./common/plugins/services";

import apiApp from "./plugins/api";
import gameApiApp from "./plugins/gameapi";
import battleApp from "./plugins/battle";

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: number,
      API_PORT: number,
      BATTLE_PORT: number,
      AES_KEY: string,
      API_KEY: string,
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
  required: [ "PORT", "BATTLE_PORT", "AES_KEY", "MONGODB_URI", "JWT_SECRET" ],
  properties: {
    PORT: {
      type: 'number',
      default: 3000
    },
    API_PORT: {
      type: 'number',
      default: 3001
    },
    BATTLE_PORT: {
      type: 'number',
      default: 3002
    },
    API_KEY: {
      type: "string"
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
    const gameApiInstance = fastify({ logger: true });
    gameApiInstance.addHook('preHandler', (request, reply, done) => {
      request.log.info({ url: request.raw.url, method: request.raw.method }, `received ${typeof request.body == "object" ? JSON.stringify(request.body) : request.body}`)
      done()
    })
    gameApiInstance.addHook('onSend', (request, reply, payload, done) => {
      request.log.info({ url: request.raw.url, method: request.raw.method }, `sending ${payload}`)
      done()
    })

    await gameApiInstance.register(fastifyEnv, { dotenv: true, schema: ENV_SCHEMA });
    await gameApiInstance.register(mongoosePlugin, { uri: gameApiInstance.config.MONGODB_URI });
    await gameApiInstance.register(modelsPlugin);
    await gameApiInstance.register(servicesPlugin);
    await gameApiInstance.register(encryptionPlugin, {
        aesKey: Buffer.from(gameApiInstance.config.AES_KEY),
    });
    await gameApiInstance.register(authPlugin);
    gameApiInstance.register(gameApiApp);
    gameApiInstance.listen({
        port: gameApiInstance.config.PORT,
        host: "0.0.0.0",
    });

    const apiInstance = fastify({ logger: true });
    await apiInstance.register(fastifyEnv, { dotenv: true, schema: ENV_SCHEMA });
    await apiInstance.register(mongoosePlugin, { uri: apiInstance.config.MONGODB_URI });
    await apiInstance.register(modelsPlugin);
    await apiInstance.register(servicesPlugin);
    await apiInstance.register(authPlugin);
    apiInstance.register(apiApp);
    apiInstance.listen({
        port: apiInstance.config.API_PORT,
        host: "0.0.0.0",
    });

    const battleInstance = fastify({ logger: true });
    await battleInstance.register(mongoosePlugin, { uri: process.env.MONGO_URI! });
    await battleInstance.register(modelsPlugin);
    await battleInstance.register(servicesPlugin);
    await battleInstance.register(encryptionPlugin, {
        aesKey: Buffer.from(process.env.BATTLE_AES_KEY!),
    });
    await battleInstance.register(authPlugin);
    battleInstance.register(battleApp);
    battleInstance.listen({
        port: parseInt(process.env.BATTLE_PORT || "") || 3001,
        host: "0.0.0.0",
    });
}

main().catch(console.error);
