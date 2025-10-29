import fastify from "fastify";
import fastifyEnv from "@fastify/env";

import { createTransport, Transporter } from "nodemailer";

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
      BATTLE_AES_KEY: string,
      TRUST_PROXY: boolean,
      API_KEY: string,
      MONGODB_URI: string,
      JWT_SECRET: string,

      CONFIG_DEFAULT_AC: number,
      CONFIG_DEFAULT_DP: number,
      CONFIG_DEFAULT_NAVI: number,

      SMTP_HOST: string,
      SMTP_PORT: number,
      SMTP_USERNAME: string,
      SMTP_PASSWORD: string,
      SMTP_FROM: string,
    };
    mail: Transporter;
  }
}
const ENV_SCHEMA = {
  type: 'object',
  required: [ "PORT", "BATTLE_PORT", "TRUST_PROXY", "AES_KEY", "BATTLE_AES_KEY", "MONGODB_URI", "JWT_SECRET", "SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_FROM" ],
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
    TRUST_PROXY: {
      type: "boolean",
      default: false
    },
    AES_KEY: {
      type: "string",
    },
    BATTLE_AES_KEY: {
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
    
    SMTP_HOST: {
      type: "string"
    },
    SMTP_PORT: {
      type: "number"
    },
    SMTP_USERNAME: {
      type: "string"
    },
    SMTP_PASSWORD: {
      type: "string"
    },
    SMTP_FROM: {
      type: "string"
    },
  }
};

async function main() {
    let gameApiInstance = fastify({ logger: true });
    await gameApiInstance.register(fastifyEnv, { dotenv: true, schema: ENV_SCHEMA });

    // This is very stupid
    if (gameApiInstance.config.TRUST_PROXY) {
        gameApiInstance = fastify({ logger: true, trustProxy: true });
        await gameApiInstance.register(fastifyEnv, { dotenv: true, schema: ENV_SCHEMA });
    }
    gameApiInstance.addHook('preHandler', (request, reply, done) => {
      request.log.info({ url: request.raw.url, method: request.raw.method }, `received ${typeof request.body == "object" ? JSON.stringify(request.body) : request.body}`)
      done()
    })
    gameApiInstance.addHook('onSend', (request, reply, payload, done) => {
      request.log.info({ url: request.raw.url, method: request.raw.method }, `sending ${payload}`)
      done()
    })

    await gameApiInstance.decorate("mail", createTransport({
        host: gameApiInstance.config.SMTP_HOST,
        port: gameApiInstance.config.SMTP_PORT,
        secure: gameApiInstance.config.SMTP_PORT == 465,
        auth: {
            user: gameApiInstance.config.SMTP_USERNAME,
            pass: gameApiInstance.config.SMTP_PASSWORD,
        }
    }));
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
    await apiInstance.decorate("mail", createTransport({
        host: apiInstance.config.SMTP_HOST,
        port: apiInstance.config.SMTP_PORT,
        secure: apiInstance.config.SMTP_PORT == 465,
        auth: {
            user: apiInstance.config.SMTP_USERNAME,
            pass: apiInstance.config.SMTP_PASSWORD,
        }
    }));
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
    await battleInstance.register(fastifyEnv, { dotenv: true, schema: ENV_SCHEMA });
    await battleInstance.register(mongoosePlugin, { uri: battleInstance.config.MONGODB_URI });
    await battleInstance.register(modelsPlugin);
    await battleInstance.register(servicesPlugin);
    await battleInstance.register(encryptionPlugin, {
        aesKey: Buffer.from(battleInstance.config.BATTLE_AES_KEY),
    });
    await battleInstance.register(authPlugin);
    battleInstance.register(battleApp);
    battleInstance.listen({
        port: battleInstance.config.BATTLE_PORT,
        host: "0.0.0.0",
    });
}

main().catch(console.error);
