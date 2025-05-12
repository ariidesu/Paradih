import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

import { buildUserService } from "../services/userService";
import { buildAuthService } from "../services/authService";
import { buildMailService } from "../services/mailService";
import { buildUserSaveService } from "../services/userSaveService";
import { buildPlayService } from "../services/playService";
import { buildGameDataService } from "../services/gameDataService";

declare module "fastify" {
    interface FastifyInstance {
        userService: ReturnType<typeof buildUserService>;
        userSaveService: ReturnType<typeof buildUserSaveService>;
        authService: ReturnType<typeof buildAuthService>;
        mailService: ReturnType<typeof buildMailService>;
        playService: ReturnType<typeof buildPlayService>;
        gameDataService: ReturnType<typeof buildGameDataService>;
    }
}

const servicesPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.decorate("userService", buildUserService(fastify));
    fastify.decorate("userSaveService", buildUserSaveService(fastify));
    fastify.decorate("authService", buildAuthService(fastify));
    fastify.decorate("mailService", buildMailService(fastify));
    fastify.decorate("playService", buildPlayService(fastify));
    fastify.decorate("gameDataService", buildGameDataService(fastify));
};

export default fp(servicesPlugin);
