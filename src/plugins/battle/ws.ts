import { FastifyPluginAsync } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { ClientMessage } from "./types";
import { Player, RoomsManager } from "./manager";
import { LinkerClient, PlayerInfo } from "./linkerClient";
import { randomUUID } from "crypto";

const battleWs: FastifyPluginAsync = async (app) => {
    await app.register(fastifyWebsocket);

    const manager = new RoomsManager(app);
    const linkerClient = new LinkerClient(app);
    app.addHook("onClose", async () => {
        linkerClient.close();
        manager.close();
    });

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

        let player: Player | undefined;
        let linkerPlayerInfo: PlayerInfo | undefined;
        let initialized = false;
        let processing = Promise.resolve();

        socket.on("message", (msg) => {
            processing = processing.then(async () => {
                try {
                    if (socket.readyState !== 1) return;
                    const message: ClientMessage = JSON.parse(app.decryptPara(Buffer.from(msg.toString(), "base64")));
                    const acknowledge = () => {
                        if (message.nonce && socket.readyState === 1) {
                            socket.send(app.encryptPara(JSON.stringify({ status: "ok", code: "OK", nonce: message.nonce })).toString("base64"));
                        }
                    };
                    if (message.action === "heartbeat") {
                        acknowledge();
                        return;
                    }

                    if (!initialized) {
                        const playerId = String(request.user!._id);
                        const userSave = (await app.userSaveService.getSave(request.user!)).data;
                        if (socket.readyState !== 1) return;
                        const activeCharacter = (userSave.get("/dict/currentCharacter") as string) ?? "para";
                        const activeSkin = (userSave.get(`/dict/skin/active/${activeCharacter}`) as string) ?? "para/default"
                        const isPrdOnline = app.config.PARADIGM_ONLINE_ENABLED &&
                            (app.config.PARADIGM_ONLINE_FORCE_ACTIVE ||
                                (request.user!.prdOnline && request.user!.prdOnlineTime > Math.floor(Date.now() / 1000)));

                        if (app.config.CROSS_DECODE_USE_LINKER) {
                            linkerPlayerInfo = {
                                id: playerId,
                                username: request.user!.username,
                                usernameMask: request.user!.usernameCode.toString(),
                                level: 0,
                                rating: request.user!.rating,
                                battleRating: request.user!.battleRating,
                                isPrdOnline,
                                style: {
                                    skin: activeSkin,
                                    bg: request.user!.style.background,
                                    title: request.user!.style.title
                                }
                            };
                            if (!linkerClient.addUser(linkerPlayerInfo, socket)) {
                                linkerPlayerInfo = undefined;
                                socket.send(app.encryptPara(JSON.stringify({ status: "failed", code: "IN_BATTLE_ALREADY", nonce: message.nonce ?? randomUUID() })).toString("base64"));
                                socket.close();
                                return;
                            }
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
                            player.isPrdOnline = isPrdOnline;
                        }
                        initialized = true;
                    }

                    if (app.config.CROSS_DECODE_USE_LINKER) {
                        if (!linkerPlayerInfo) return;
                        if (!linkerClient.isConnected()) {
                            socket.close();
                            return;
                        }
                        if (message.action === "startMatch") {
                            linkerPlayerInfo.level = message.data.playerLevel;
                        }
                        if (message.action === "cancelGame" || message.action === "gameIsOver") {
                            acknowledge();
                            await linkerClient.forwardToLinker(linkerPlayerInfo, message);
                            linkerClient.removeUser(linkerPlayerInfo, false);
                            socket.close();
                        } else {
                            await linkerClient.forwardToLinker(linkerPlayerInfo, message);
                        }
                    } else {
                        if (!player) return;
                        const room = manager.getRoomByPlayerId(player.id);
                        if (!room && !["startMatch", "cancelGame", "gameIsOver"].includes(message.action)) {
                            player.sendMessage({ status: "failed", code: "NOT_IN_QUEUE", nonce: message.nonce ?? randomUUID() });
                            return;
                        }

                        switch (message.action) {
                            case "startMatch":
                                player.level = message.data.playerLevel;
                                player.isHiddenInfo = message.data.isHiddenInfo;
                                player.isHiddenRating = message.data.isHiddenRating;
                                if (!manager.addPlayer(player)) {
                                    player.sendMessage({ status: "failed", code: "IN_BATTLE_ALREADY", nonce: message.nonce ?? randomUUID() });
                                    return;
                                }
                                break;
                            case "cancelGame":
                                manager.removePlayer(player);
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
                                if (!await room!.onPlayerDonePlaying(player, message)) return;
                                break;
                            case "gameIsOver":
                                manager.removePlayer(player);
                                break;
                        }
                        acknowledge();
                        if (message.action === "cancelGame" || message.action === "gameIsOver") socket.close();
                    }

                } catch (error) {
                    console.error("Error processing WebSocket message:", error);
                }
            });
        });

        socket.on("close", () => {
            if (app.config.CROSS_DECODE_USE_LINKER) {
                linkerClient.removeUser(linkerPlayerInfo);
            } else {
                manager.removePlayer(player);
            }
        });

        socket.on("error", () => {
            if (app.config.CROSS_DECODE_USE_LINKER) {
                linkerClient.removeUser(linkerPlayerInfo);
            } else {
                manager.removePlayer(player);
            }
        });
    });
};

export default battleWs;
