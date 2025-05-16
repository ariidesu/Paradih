import { FastifyPluginAsync } from "fastify";
import songsRoutes from "./routes/songs";
import usersRoutes from "./routes/users";

const apiApp: FastifyPluginAsync = async (app) => {
    app.register(songsRoutes, { prefix: "/songs" });
    app.register(usersRoutes, { prefix: "/users" });
};

export default apiApp;