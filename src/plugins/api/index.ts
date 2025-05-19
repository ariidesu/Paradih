import { FastifyPluginAsync } from "fastify";
import songsRoutes from "./routes/songs";
import usersRoutes from "./routes/users";
import playRoutes from "./routes/plays";

const apiApp: FastifyPluginAsync = async (app) => {
    app.register(songsRoutes, { prefix: "/songs" });
    app.register(usersRoutes, { prefix: "/users" });
    app.register(playRoutes, { prefix: "/plays" });
};

export default apiApp;