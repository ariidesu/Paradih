import { FastifyPluginAsync } from "fastify";
import type { UserDoc } from "../models/User";

declare module 'fastify' {
    interface FastifyRequest {
      user: UserDoc | null;
    }
  }

const authPlugin: FastifyPluginAsync = async (app) => {
    app.decorate("verifyAuthToken", app.authService.verifyAuthToken);
};

export default authPlugin;