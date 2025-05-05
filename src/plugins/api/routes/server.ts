import { FastifyPluginAsync } from "fastify";

const serverRoutes: FastifyPluginAsync = async (app) => {
    app.get("/check", async (request, reply) => {
        return {};
    });
};

export default serverRoutes;