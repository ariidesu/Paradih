import { FastifyPluginAsync } from "fastify";

const rankRoutes: FastifyPluginAsync = async (app) => {
    app.get(
        "/list",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            return { status: "ok", data: [] };
        }
    );

    app.post(
        "/query_info",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            return { status: "ok", data: [] };
        }
    );

    app.post(
        "/start_play",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            throw new Error("not implemented yippi");
        }
    );
};

export default rankRoutes;
