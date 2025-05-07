import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

import { buildUserService } from "../services/userService";
import { buildAuthService } from "../services/authService";
import { buildMailService } from "../services/mailService";
import { buildUserSaveService } from "../services/userSaveService";

declare module "fastify" {
    interface FastifyInstance {
        userService: ReturnType<typeof buildUserService>;
        userSaveService: ReturnType<typeof buildUserSaveService>;
        authService: ReturnType<typeof buildAuthService>;
        mailService: ReturnType<typeof buildMailService>;
    }
}

const servicesPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.decorate("userService", buildUserService(fastify));
    fastify.decorate("userSaveService", buildUserSaveService(fastify));
    fastify.decorate("authService", buildAuthService(fastify));
    fastify.decorate("mailService", buildMailService(fastify));
};

export default fp(servicesPlugin);
