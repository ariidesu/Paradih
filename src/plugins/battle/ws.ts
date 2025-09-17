import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fastifyWebsocket, { WebSocket } from "@fastify/websocket";
import { randomUUID } from "crypto";

type BaseMessage = {
    action: string;
    nonce?: string;
}

type UpdateScoreData = {
    score: number;
    totalNote: number;
    near: number;
    received: number;
    lost: number;
    hasMiss: boolean;
};

type ClientBaseMessage = BaseMessage & { timestamp: number }
type ServerBaseMessage = BaseMessage & { status: "ok" | "fail" }

type ServerMatchConfirmMessage = ServerBaseMessage & {
    status: "ok";
    action: "matchConfirm";
    data: {}
}

type ServerMatchSuccessMessage = ServerBaseMessage & {
    status: "ok";
    action: "matchSuccess";
    data: {
        roomId: string;
        chartInfo: {
            trackList: string[],
            diffList: number[],
            chartSpeacialEffectList: any[];
        };

        opponentId: string;
        opponentRating: number;
        opponentBattleRating: number;
        opponentStyle: {
            skin: string;
            bg: string;
            title: string;
        };
        opponentUsername: string;
        opponentUsernameMask: string;
        opponentLevel: number;
    };
}

type ServerAnnounceFinalMessage = ServerBaseMessage & {
    status: "ok",
    action: "annoFinnalChart",
    data: {
        banChartIndex: number[];
        trackId: string;
        chartDiff: number;
        chartSpeacialEffect: any;
    };
}

type ServerAllPlayerReadyMessage = ServerBaseMessage & {
    status: "ok";
    action: "allPlayerReady";
    data: {}
}

type ServerOpponentScoreUpdateMessage = ServerBaseMessage & {
    status: "ok";
    action: "opponentScoreUpdate";
    data: UpdateScoreData;
}

type ServerGameOverMessage = ServerBaseMessage & {
    status: "ok";
    action: "gameOver";
    data: {
        isWin: boolean;
        beforeRating: number;
        ratingChanges: number;
        afterRating: number;

        opponentRating: number;
        opponentScore: {
            score: number;
            decryptedPlus: number;
            decrypted: number;
            received: number;
            lost: number;
            grade: "INF+" | "INF" | "AAA+" | "AAA" | "AA+" | "AA" | "A+" | "A" | "B" | "C" | "D";
        },
        opponentJudgeDetails: [number, number, number, number]
    };
}

type ServerMessage = ServerMatchConfirmMessage | ServerMatchSuccessMessage | ServerAnnounceFinalMessage | ServerAllPlayerReadyMessage | ServerOpponentScoreUpdateMessage | ServerGameOverMessage;

type ClientHeartbeatMessage = ClientBaseMessage & {
    action: "heartbeat";
    data: {}
}

type ClientStartMatchMessage = ClientBaseMessage & {
    action: "startMatch";
    data: {
        isHiddenInfo: boolean;
        isHiddenRating: boolean;
        playerLevel: number
    }
}

type ClientCancelGameMessage = ClientBaseMessage & {
    action: "cancelGame";
    data: {}
}

type ClientBanChartMessage = ClientBaseMessage & {
    action: "banChart";
    data: {
        chartIndex: number
    }
}

type ClientReadyMessage = ClientBaseMessage & {
    action: "playerReady";
    data: {}
}

type ClientUpdateScoreMessage = ClientBaseMessage & {
    action: "updateScore";
    data: UpdateScoreData
}

type ClientDonePlayingMessage = ClientBaseMessage & {
    action: "donePlaying";
    data: {
        resultId: string;
        judgeDetails: [number, number, number, number]
    }
}

type ClientGameOverMessage = ClientBaseMessage & {
    action: "gameIsOver";
    data: {}
}

type ClientMessage = ClientHeartbeatMessage | ClientStartMatchMessage | ClientCancelGameMessage | ClientBanChartMessage | ClientReadyMessage | ClientUpdateScoreMessage | ClientDonePlayingMessage | ClientGameOverMessage;

class Player {
    public readonly id: string;
    public readonly username: string;
    public readonly usernameMask: string;
    public level: number;
    public rating: number;
    public battleRating: number;
    public readonly style: { skin: string; bg: string; title: string; };
    private socket: WebSocket;
    private app: FastifyInstance;

    constructor(
        socket: WebSocket,
        userId: string,
        username: string,
        usernameMask: string,
        playerLevel: number,
        rating: number,
        battleRating: number,
        skin: string,
        background: string,
        title: string,
        app: FastifyInstance
    ) {
        this.socket = socket;
        this.id = userId;
        this.username = username;
        this.usernameMask = usernameMask;
        this.level = playerLevel;
        this.rating = rating;
        this.battleRating = battleRating;
        this.style = { skin, bg: background, title };
        this.app = app;
    }

    sendMessage(message: ServerMessage) {
        if (this.socket.readyState == 1) {
            message.status = "ok";
            message.nonce = randomUUID();
            this.socket.send(this.app.encryptPara(JSON.stringify(message)).toString("base64"));
        }
    }

    disconnect() {
        if (this.socket.readyState == 1) {
            this.socket.close();
        }
    }
}

class Room {
    public readonly id: string;
    public players: [Player, Player];

    private app: FastifyInstance;
    private state: "waiting" | "banning" | "ingame" | "finished" = "waiting";
    private roster: {
        trackList: string[];
        diffList: number[];
    } = {
        trackList: [],
        diffList: []
    };
    private playersBanned: [boolean, boolean] = [false, false];
    private playersReady: [boolean, boolean] = [false, false];
    private playersDisconnected: [boolean, boolean] = [false, false];
    private playersFinished: [boolean, boolean] = [false, false];
    private playersResultIds: [string?, string?] = [undefined, undefined];
    private playersJudgeDetails: [[number, number, number, number], [number, number, number, number]] = [[0, 0, 0, 0], [0, 0, 0, 0]];
    private bannedTrackIndexes: [number, number] = [-1, -1];

    constructor(app: FastifyInstance, players: [Player, Player]) {
        this.id = randomUUID();
        this.app = app;
        this.players = players;

        this.broadcast({
            status: "ok",
            action: "matchConfirm",
            data: {}
        });

        this.makeRoster();

        console.log(`Room ${this.id} created for ${players[0].username} and ${players[1].username}`);
        this.begin();
    }

    public getPlayerIndex(player: Player) {
        return this.players.indexOf(player);
    }

    public onPlayerSetBan(player: Player, message: ClientBanChartMessage) {
        const playerIndex = this.getPlayerIndex(player);
        if (playerIndex == -1) return;

        this.playersBanned[playerIndex] = true;
        this.bannedTrackIndexes[playerIndex] = message.data.chartIndex;
    }

    public onPlayerReady(player: Player) {
        const playerIndex = this.getPlayerIndex(player);
        if (playerIndex == -1) return;

        this.playersReady[playerIndex] = true;
    }

    public onPlayerUpdateScore(player: Player, message: ClientUpdateScoreMessage) {
        const playerIndex = this.getPlayerIndex(player);
        if (playerIndex === -1) return;

        const oppositeIndex = 1 - playerIndex;
        this.players[oppositeIndex].sendMessage({
            status: "ok",
            action: "opponentScoreUpdate",
            data: message.data
        });
    }

    public onPlayerDonePlaying(player: Player, message: ClientDonePlayingMessage) {
        const playerIndex = this.getPlayerIndex(player);
        if (playerIndex == -1) return;

        this.playersResultIds[playerIndex] = message.data.resultId;
        this.playersJudgeDetails[playerIndex] = message.data.judgeDetails;
        this.playersFinished[playerIndex] = true;
    }

    public onPlayerDisconnect(player: Player) {
        console.log(`Room ${this.id}: Player ${player.username} disconnected`);
        const playerIndex = this.getPlayerIndex(player);
        if (playerIndex == -1) return;

        this.playersDisconnected[playerIndex] = true;

        const oppositeIndex = 1 - playerIndex;
        if (this.state != "finished") {
            if (!this.playersDisconnected[oppositeIndex] && (this.state == "banning" || this.state == "ingame")) {
                this.players[oppositeIndex].sendMessage({
                    status: "ok",
                    action: "gameOver",
                    data: {
                        isWin: true,
                        beforeRating: 0,
                        ratingChanges: 0,
                        afterRating: 0,
                        opponentRating: 0,
                        opponentScore: { score: 0, grade: 'D', decrypted: 0, decryptedPlus: 0, lost: 0, received: 0 },
                        opponentJudgeDetails: [0, 0, 0, 0],
                    }
                });
            }

            this.state = "finished";
            this.destroy();
        }
    }

    public destroy() {
        this.players.forEach(p => p.disconnect());
    }

    private broadcast(message: ServerMessage) {
        this.players.forEach(p => p.sendMessage(message));
    }

    private makeRoster() {
        const availableTracks = this.app.gameDataService.getSongs().map(s => s.songId);
        const trackList = availableTracks.sort(() => 0.5 - Math.random()).slice(0, 5);

        // NOTE: Not how official did it.
        const diffList = [
            2,
            2,
            Math.random() > 0.8 ? 1 : 2,
            Math.random() > 0.6 ? 1 : 2,
            Math.random() > 0.3 ? 1 : 2,
        ];

        this.roster = { trackList, diffList };
    }

    private getGradeFromScore(score: number): "INF+" | "INF" | "AAA+" | "AAA" | "AA+" | "AA" | "A+" | "A" | "B" | "C" | "D" {
        if (score >= 1010000) return "INF+";
        if (score >= 1000000) return "INF";
        if (score >= 990000) return "AAA+";
        if (score >= 980000) return "AAA";
        if (score >= 970000) return "AA+";
        if (score >= 950000) return "AA";
        if (score >= 930000) return "A+";
        if (score >= 900000) return "A";
        if (score >= 850000) return "B";
        if (score >= 800000) return "C";
        return "D";
    }

    private begin() {
        if (this.state != "waiting") return;

        const [player1, player2] = this.players;
        player1.sendMessage({
            status: "ok",
            action: "matchSuccess",
            data: {
                roomId: this.id,
                chartInfo: { ...this.roster, chartSpeacialEffectList: Array(this.roster.trackList.length).fill(null) },
                opponentId: player2.id,
                opponentRating: player2.rating,
                opponentBattleRating: player2.battleRating,
                opponentStyle: player2.style,
                opponentUsername: player2.username,
                opponentUsernameMask: player2.usernameMask,
                opponentLevel: player2.level
            }
        });
        player2.sendMessage({
            status: "ok",
            action: "matchSuccess",
            data: {
                roomId: this.id,
                chartInfo: { ...this.roster, chartSpeacialEffectList: Array(this.roster.trackList.length).fill(null) },
                opponentId: player1.id,
                opponentRating: player1.rating,
                opponentBattleRating: player1.battleRating,
                opponentStyle: player1.style,
                opponentUsername: player1.username,
                opponentUsernameMask: player1.usernameMask,
                opponentLevel: player1.level,
            }
        });

        this.banPhase();
    }

    private async banPhase() {
        if (this.state != "waiting") return;
        this.state = "banning";

        while (!this.playersBanned[0] || !this.playersBanned[1]) {
            if (this.playersDisconnected[0] || this.playersDisconnected[1]) return;
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Just in case........ can be removed though?
        await new Promise(resolve => setTimeout(resolve, 300));

        const canChooseTrackIndexes = this.roster.trackList.map((_, index) => index).filter((i) => !this.bannedTrackIndexes.includes(i));
        const chosenTrackIndex = canChooseTrackIndexes[Math.floor(Math.random() * canChooseTrackIndexes.length)];
        this.broadcast({
            status: "ok",
            action: "annoFinnalChart",
            data: {
                banChartIndex: this.bannedTrackIndexes,
                trackId: this.roster.trackList[chosenTrackIndex],
                chartDiff: this.roster.diffList[chosenTrackIndex],
                chartSpeacialEffect: null
            }
        });

        while (!this.playersReady[0] || !this.playersReady[1]) {
            if (this.playersDisconnected[0] || this.playersDisconnected[1]) return;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.ingamePhase();
    }

    private async ingamePhase() {
        if (this.state != "banning") return;

        this.state = "ingame";
        this.broadcast({
            status: "ok",
            action: "allPlayerReady",
            data: {}
        });

        while (!this.playersFinished[0] || !this.playersFinished[1]) {
            if (this.playersDisconnected[0] || this.playersDisconnected[1]) return;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.state = "finished";

        const [player1, player2] = this.players;
        const player1Result = await this.app.playService.getChartPlayByOnlyId(this.playersResultIds[0] ?? "");
        const player2Result = await this.app.playService.getChartPlayByOnlyId(this.playersResultIds[1] ?? "");

        let player1RatingChange = 0;
        let player2RatingChange = 0;

        const player1Score = {
            score: player1Result?.score ?? 0,
            decryptedPlus: player1Result?.stats.decrypted_plus ?? 0,
            decrypted: player1Result?.stats.decrypted ?? 0,
            received: player1Result?.stats.received ?? 0,
            lost: player1Result?.stats.lost ?? 0,
            grade: this.getGradeFromScore(player1Result?.score ?? 0),
        };
        const player2Score = {
            score: player2Result?.score ?? 0,
            decryptedPlus: player2Result?.stats.decrypted_plus ?? 0,
            decrypted: player2Result?.stats.decrypted ?? 0,
            received: player2Result?.stats.received ?? 0,
            lost: player2Result?.stats.lost ?? 0,
            grade: this.getGradeFromScore(player2Result?.score ?? 0),
        };

        let player1Win = false;
        if (player1Result && player2Result) {
            player1Win = player1Result.score > player2Result.score;
        } else {
            player1Win = player1Result != null;
        }

        // TODO: Battle rating

        player1.sendMessage({
            status: "ok",
            action: "gameOver",
            data: {
                isWin: player1Win,
                beforeRating: 0,
                ratingChanges: 0,
                afterRating: 0,
                opponentRating: 0,
                opponentScore: player2Score,
                opponentJudgeDetails: this.playersJudgeDetails[1],
            }
        });
        player2.sendMessage({
            status: "ok",
            action: "gameOver",
            nonce: randomUUID(),
            data: {
                isWin: !player1Win,
                beforeRating: 0,
                ratingChanges: 0,
                afterRating: 0,
                opponentRating: 0,
                opponentScore: player1Score,
                opponentJudgeDetails: this.playersJudgeDetails[0],
            }
        });
    }
}

class RoomsManager {
    private app: FastifyInstance;
    private waitingQueue: Player[] = [];
    private rooms = new Map<string, Room>();
    private playerToRoomMap = new Map<string, string>();

    public constructor(app: FastifyInstance) {
        this.app = app;
    }

    public addPlayer(player: Player) {
        if (this.playerToRoomMap.has(player.id) || this.waitingQueue.some(p => p.id == player.id)) {
            player.disconnect();
            return;
        }

        console.log(`${player.username} added to queue`);
        this.waitingQueue.push(player);
        this.createRoom();
    }

    private createRoom() {
        if (this.waitingQueue.length >= 2) {
            const [player1, player2] = this.waitingQueue.splice(0, 2);
            const room = new Room(this.app, [player1, player2]);

            this.rooms.set(room.id, room);
            this.playerToRoomMap.set(player1.id, room.id);
            this.playerToRoomMap.set(player2.id, room.id);

            this.removeFromQueue(player1);
            this.removeFromQueue(player2);
        }
    }
    
    public getRoomByPlayerId(playerId: string): Room | undefined {
        const roomId = this.playerToRoomMap.get(playerId);
        return roomId ? this.rooms.get(roomId) : undefined;
    }

    public removeFromQueue(player: Player) {
        const queueIndex = this.waitingQueue.findIndex(p => p.id === player.id);
        if (queueIndex != -1) {
            this.waitingQueue.splice(queueIndex, 1);
            console.log(`${player.username} removed from queue`);
            return;
        }
    }

    public removePlayer(player: Player) {
        this.removeFromQueue(player);

        const room = this.getRoomByPlayerId(player.id);
        if (room) {
            room.onPlayerDisconnect(player);
            room.players.forEach(p => this.playerToRoomMap.delete(p.id));
            this.rooms.delete(room.id);
        }
    }
}

const battleWs: FastifyPluginAsync = async (app) => {
    await app.register(fastifyWebsocket);

    const manager = new RoomsManager(app);

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
        socket.on("message", async (msg) => {
            try {
                const message: ClientMessage = JSON.parse(app.decryptPara(Buffer.from(msg.toString(), "base64")));

                // We create in here instead to prevent delay in receiving message
                // Particularly the startMatch message...
                if (!player) {
                    const userSave = (await app.userSaveService.getSave(request.user!)).data;
                    const activeCharacter = (userSave.get("/dict/currentCharacter") as string) ?? "para";
                    const activeSkin = (userSave.get(`/dict/skin/active/${activeCharacter}`) as string) ?? "para/default";
                    player = new Player(
                        socket,
                        (request.user!._id as any).toString(),
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

            } catch (error) {
                console.error("Error processing WebSocket message:", error);
            }
        });

        socket.on("close", () => {
            manager.removePlayer(player);
        });
        
        socket.on("error", () => {
            manager.removePlayer(player);
        });
    });
};

export default battleWs;