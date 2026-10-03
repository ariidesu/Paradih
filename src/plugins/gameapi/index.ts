import { FastifyPluginAsync } from "fastify";
import serverRoutes from "./routes/server";
import rankRoutes from "./routes/rank";
import unauthenticatedUserRoutes from "./routes/unauthenticatedUser";
import authenticatedUserRoutes from "./routes/authenticatedUser";
import shopRoutes from "./routes/shop";
import hotassetsRoutes from "./routes/hotassets";
import prdonlineRoutes from "./routes/prdonline";
import mailRoutes from "./routes/mail";
import main05EventRoutes from "./routes/main05Event";

const gameApiApp: FastifyPluginAsync = async (app) => {
    app.register(unauthenticatedUserRoutes, { prefix: "/user" });
    app.register(serverRoutes, { prefix: "/server" });
    app.register(rankRoutes, { prefix: "/server/rank" });
    app.register(authenticatedUserRoutes, { prefix: "/server/user" });
    app.register(shopRoutes, { prefix: "/server/shop" });
    app.register(hotassetsRoutes, { prefix: "/server/hotassets" });
    app.register(prdonlineRoutes, { prefix: "/server/prdonline" });
    app.register(mailRoutes, { prefix: "/server/mail" });
    app.register(main05EventRoutes, { prefix: "/server/main05_event" });
};

export default gameApiApp;
