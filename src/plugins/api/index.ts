import { FastifyPluginAsync } from "fastify";
import serverRoutes from "./routes/server";
import rankRoutes from "./routes/rank";
import unauthenticatedUserRoutes from "./routes/unauthenticatedUser";
import authenticatedUserRoutes from "./routes/authenticatedUser";

const apiApp: FastifyPluginAsync = async (app) => {
    app.register(unauthenticatedUserRoutes, { prefix: "/user" });
    app.register(serverRoutes, { prefix: "/server" });
    app.register(rankRoutes, { prefix: "/server/rank" });
    app.register(authenticatedUserRoutes, { prefix: "/server/user" });
};

export default apiApp;