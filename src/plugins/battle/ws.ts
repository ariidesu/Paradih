import { FastifyPluginAsync } from "fastify";
import fastifyWebsocket from "@fastify/websocket";

const battleWs: FastifyPluginAsync = async (app) => {
    await app.register(fastifyWebsocket);

    // TODO: Implement this thing
    app.get("/battle_ws", { 
        preHandler: app.authService.verifyBattleToken,
        websocket: true
    }, async (socket, request) => {
        if (!request.user) {
            socket.close();
            return;
        }

        // NOTE: Is this correct?
        if (request.user.battleBanned && request.user.battleBanUntil.getTime() > Date.now()) {
            socket.close();
            return;
        }
    });
};

export default battleWs;