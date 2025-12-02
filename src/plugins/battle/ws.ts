import { FastifyPluginAsync } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { ClientMessage } from "./types";
import { Player, RoomsManager } from "./manager";
import { LinkerClient, PlayerInfo } from "./linkerClient";

const battleWs: FastifyPluginAsync = async (app) => {
    await app.register(fastifyWebsocket);

    const manager = new RoomsManager(app);
    const linkerClient = new LinkerClient(app);

    if (app.config.CROSS_DECODE_USE_LINKER) {
        linkerClient.connect().catch(err => {
            console.error("Failed to connect to linker:", err);
        });
    }

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

        let player: Player;
        let linkerPlayerInfo: PlayerInfo;
        let initialized = false;

        socket.on("message", async (msg) => {
            try {
                const message: ClientMessage = JSON.parse(app.decryptPara(Buffer.from(msg.toString(), "base64")));

                if (!initialized) {
                    const playerId = (request.user!._id as any).toString();
                    const userSave = (await app.userSaveService.getSave(request.user!)).data;
                    const activeCharacter = (userSave.get("/dict/currentCharacter") as string) ?? "para";
                    const activeSkin = (userSave.get(`/dict/skin/active/${activeCharacter}`) as string) ?? "para/default"

                    if (app.config.CROSS_DECODE_USE_LINKER) {
                        linkerPlayerInfo = {
                            id: playerId,
                            username: request.user!.username,
                            usernameMask: request.user!.usernameCode.toString(),
                            level: 0,
                            rating: request.user!.rating,
                            battleRating: request.user!.battleRating,
                            style: {
                                skin: activeSkin,
                                bg: request.user!.style.background,
                                title: request.user!.style.title
                            }
                        };
                    } else {
                        player = new Player(
                            socket,
                            playerId,
                            request.user!.username,
                            request.user!.usernameCode.toString(),
                            0, // when player send startMatch, we will update the level
                            request.user!.rating,
                            request.user!.battleRating,
                            activeSkin,
                            request.user!.style.background,
                            request.user!.style.title,
                            app
                        );
                    }
                    initialized = true;
                }

                if (app.config.CROSS_DECODE_USE_LINKER) {
                    if (message.action === "startMatch") {
                        linkerPlayerInfo.level = message.data.playerLevel;
                        linkerClient.addUser(linkerPlayerInfo, socket);
                    }
                    if (message.action === "cancelGame" || message.action === "gameIsOver") {
                        await linkerClient.forwardToLinker(linkerPlayerInfo, message);
                        linkerClient.removeUser(linkerPlayerInfo.id);
                        socket.close();
                    } else if (message.action !== "heartbeat") {
                        await linkerClient.forwardToLinker(linkerPlayerInfo, message);
                    }
                } else {
                    const room = manager.getRoomByPlayerId(player.id);
                    if (!room && !["startMatch", "cancelGame"].includes(message.action)) {
                        return;
                    }

                    switch (message.action) {
                        case "heartbeat":
                            break;
                        case "startMatch":
                            player.level = message.data.playerLevel;
                            manager.addPlayer(player);
                            break;
                        case "cancelGame":
                            manager.removePlayer(player);
                            socket.close();
                            break;
                        case "banChart":
                            room!.onPlayerSetBan(player, message);
                            break;
                        case "playerReady":
                            room!.onPlayerReady(player);
                            break;
                        case "updateScore":
                            room!.onPlayerUpdateScore(player, message);
                            break;
                        case "donePlaying":
                            room!.onPlayerDonePlaying(player, message);
                            break;
                        case "gameIsOver":
                            manager.removePlayer(player);
                            socket.close();
                            break;
                    }
                }

            } catch (error) {
                console.error("Error processing WebSocket message:", error);
            }
        });

        socket.on("close", () => {
            if (app.config.CROSS_DECODE_USE_LINKER) {
                linkerClient.removeUser(linkerPlayerInfo.id);
            } else {
                manager.removePlayer(player);
            }
        });
        
        socket.on("error", () => {
            if (app.config.CROSS_DECODE_USE_LINKER) {
                linkerClient.removeUser(linkerPlayerInfo.id);
            } else {
                manager.removePlayer(player);
            }
        });
    });
};

export default battleWs;