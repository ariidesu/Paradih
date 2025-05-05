import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

import { buildUserService } from "../services/userService";
import { buildAuthService } from "../services/authService";

declare module "fastify" {
    interface FastifyInstance {
        userService: ReturnType<typeof buildUserService>;
        authService: ReturnType<typeof buildAuthService>;
    }
}

const servicesPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.decorate("userService", buildUserService(fastify));
    fastify.decorate("authService", buildAuthService(fastify));
};

export default fp(servicesPlugin);
