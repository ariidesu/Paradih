import { FastifyPluginAsync } from "fastify";
import serverRoutes from "./routes/server";
import rankRoutes from "./routes/rank";
import unauthenticatedUserRoutes from "./routes/unauthenticatedUser";
import authenticatedUserRoutes from "./routes/authenticatedUser";
import shopRoutes from "./routes/shop";

const apiApp: FastifyPluginAsync = async (app) => {
    app.register(unauthenticatedUserRoutes, { prefix: "/user" });
    app.register(serverRoutes, { prefix: "/server" });
    app.register(rankRoutes, { prefix: "/server/rank" });
    app.register(authenticatedUserRoutes, { prefix: "/server/user" });
    app.register(shopRoutes, { prefix: "/server/shop" });
};

export default apiApp;