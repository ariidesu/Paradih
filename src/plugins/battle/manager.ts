import { FastifyInstance } from "fastify";
import { WebSocket } from "@fastify/websocket";
import { randomUUID } from "crypto";
import { ClientBanChartMessage, ClientDonePlayingMessage, ClientUpdateScoreMessage, ServerMessage } from "./types";

export class Player {
    public readonly id: string;
    public readonly username: string;
    public readonly usernameMask: string;
    public level: number;
    public rating: number;
    public battleRating: number;
    public isPrdOnline = false;
    public isHiddenInfo = false;
    public isHiddenRating = false;
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
            message.nonce ??= randomUUID();
            this.socket.send(this.app.encryptPara(JSON.stringify(message)).toString("base64"));
        }
    }

    disconnect() {
        if (this.socket.readyState == 1) {
            this.socket.close();
        }
    }
}

export class Room {
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
    private cleanupTimeout?: NodeJS.Timeout;

    constructor(app: FastifyInstance, players: [Player, Player], private onDestroy: () => void) {
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
        if (playerIndex == -1 || this.state !== "banning") return;
        if (!Number.isInteger(message.data.chartIndex) || message.data.chartIndex < -1 || message.data.chartIndex >= this.roster.trackList.length) return;
        if (this.playersBanned[playerIndex]) return;

        this.playersBanned[playerIndex] = true;
        this.bannedTrackIndexes[playerIndex] = message.data.chartIndex;
    }

    public onPlayerReady(player: Player) {
        const playerIndex = this.getPlayerIndex(player);
        if (playerIndex == -1 || this.state !== "banning") return;

        this.playersReady[playerIndex] = true;
    }

    public onPlayerUpdateScore(player: Player, message: ClientUpdateScoreMessage) {
        const playerIndex = this.getPlayerIndex(player);
        if (playerIndex === -1 || this.state !== "ingame" || this.playersFinished[playerIndex]) return;

        const oppositeIndex = 1 - playerIndex;
        this.players[oppositeIndex].sendMessage({
            status: "ok",
            action: "opponentScoreUpdate",
            data: message.data
        });
    }

    public async onPlayerDonePlaying(player: Player, message: ClientDonePlayingMessage): Promise<boolean> {
        const playerIndex = this.getPlayerIndex(player);
        if (playerIndex == -1 || !["ingame", "finished"].includes(this.state)) return false;
        if (this.playersFinished[playerIndex]) {
            return this.playersResultIds[playerIndex] === message.data.resultId;
        }
        const result = await this.app.playService.getChartPlayByOnlyId(message.data.resultId);
        if (!result || result.userId.toString() !== player.id || this.state !== "ingame") return false;

        this.playersResultIds[playerIndex] = message.data.resultId;
        this.playersJudgeDetails[playerIndex] = message.data.judgeDetails;
        this.playersFinished[playerIndex] = true;
        return true;
    }

    public onPlayerDisconnect(player: Player) {
        console.log(`Room ${this.id}: Player ${player.username} disconnected`);
        const playerIndex = this.getPlayerIndex(player);
        if (playerIndex == -1) return;

        this.playersDisconnected[playerIndex] = true;

        const oppositeIndex = 1 - playerIndex;
        if (this.state != "finished") {
            if (!this.playersDisconnected[oppositeIndex] && this.state === "banning") {
                this.players[oppositeIndex].sendMessage({
                    status: "ok",
                    action: "cancelMatch",
                    data: { reason: "OPPONENT_CANCEL" }
                });
            } else if (!this.playersDisconnected[oppositeIndex] && this.state === "ingame") {
                this.players[oppositeIndex].sendMessage({
                    status: "ok",
                    action: "opponentOffline",
                    data: { reason: "OPPONENT_CANCEL" }
                });
            }

            this.state = "finished";
            this.destroy();
        }
    }

    public destroy() {
        this.state = "finished";
        if (this.cleanupTimeout) clearTimeout(this.cleanupTimeout);
        this.onDestroy();
        this.players.forEach(p => p.disconnect());
    }

    private broadcast(message: ServerMessage) {
        this.players.forEach(p => p.sendMessage(message));
    }

    private makeRoster() {
        const availableTracks = this.app.gameDataService.getSongs().filter(s => s.charts.invaded > 0 || s.charts.massive > 0);
        const selectedTracks = availableTracks.sort(() => 0.5 - Math.random()).slice(0, 5);
        const trackList = selectedTracks.map(s => s.songId);
        const diffList = selectedTracks.map(s => {
            const difficulties = [];
            if (s.charts.invaded > 0) difficulties.push(1);
            if (s.charts.massive > 0) difficulties.push(2);
            return difficulties[Math.floor(Math.random() * difficulties.length)];
        });

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
                opponentRating: player2.isHiddenRating ? -1 : player2.rating,
                opponentBattleRating: player2.battleRating,
                opponentStyle: player2.style,
                opponentUsername: player2.isHiddenInfo ? "[Player]" : player2.username,
                opponentUsernameMask: player2.isHiddenInfo ? "[Player]" : player2.usernameMask,
                opponentLevel: player2.level,
                opponentIsPrdOnline: player2.isPrdOnline
            }
        });
        player2.sendMessage({
            status: "ok",
            action: "matchSuccess",
            data: {
                roomId: this.id,
                chartInfo: { ...this.roster, chartSpeacialEffectList: Array(this.roster.trackList.length).fill(null) },
                opponentId: player1.id,
                opponentRating: player1.isHiddenRating ? -1 : player1.rating,
                opponentBattleRating: player1.battleRating,
                opponentStyle: player1.style,
                opponentUsername: player1.isHiddenInfo ? "[Player]" : player1.username,
                opponentUsernameMask: player1.isHiddenInfo ? "[Player]" : player1.usernameMask,
                opponentLevel: player1.level,
                opponentIsPrdOnline: player1.isPrdOnline,
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
        if (this.playersDisconnected[0] || this.playersDisconnected[1]) return;

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

        let player1Win: boolean | null = false;
        if (player1Result && player2Result) {
            player1Win = player1Result.score === player2Result.score ? null : player1Result.score > player2Result.score;
        } else {
            player1Win = player1Result != null;
        }


        // TODO: Battle rating

        player1.sendMessage({
            status: "ok",
            action: "gameOver",
            data: {
                isWin: player1Win,
                beforeRating: player1.battleRating,
                ratingChanges: 0,
                afterRating: player1.battleRating,
                opponentRating: player2.battleRating,
                opponentScore: player2Score,
                opponentJudgeDetails: this.playersJudgeDetails[1],
            }
        });
        player2.sendMessage({
            status: "ok",
            action: "gameOver",
            nonce: randomUUID(),
            data: {
                isWin: player1Win === null ? null : !player1Win,
                beforeRating: player2.battleRating,
                ratingChanges: 0,
                afterRating: player2.battleRating,
                opponentRating: player1.battleRating,
                opponentScore: player1Score,
                opponentJudgeDetails: this.playersJudgeDetails[0],
            }
        });
        this.cleanupTimeout = setTimeout(() => this.destroy(), 30000);
        this.cleanupTimeout.unref();
    }
}

export class RoomsManager {
    private app: FastifyInstance;
    private waitingQueue: Player[] = [];
    private rooms = new Map<string, Room>();
    private playerToRoomMap = new Map<string, string>();

    public constructor(app: FastifyInstance) {
        this.app = app;
    }

    public addPlayer(player: Player) {
        if (this.playerToRoomMap.has(player.id) || this.waitingQueue.some(p => p.id == player.id)) {
            return false;
        }

        console.log(`${player.username} added to queue`);
        this.waitingQueue.push(player);
        this.createRoom();
        return true;
    }

    private createRoom() {
        if (this.waitingQueue.length >= 2) {
            const [player1, player2] = this.waitingQueue.splice(0, 2);
            const room = new Room(this.app, [player1, player2], () => {
                room.players.forEach(p => this.playerToRoomMap.delete(p.id));
                this.rooms.delete(room.id);
            });

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
        const queueIndex = this.waitingQueue.indexOf(player);
        if (queueIndex != -1) {
            this.waitingQueue.splice(queueIndex, 1);
            console.log(`${player.username} removed from queue`);
            return;
        }
    }

    public removePlayer(player: Player | undefined) {
        if (!player) return;
        this.removeFromQueue(player);

        const room = this.getRoomByPlayerId(player.id);
        if (room && room.players.includes(player)) {
            room.onPlayerDisconnect(player);
            room.players.forEach(p => this.playerToRoomMap.delete(p.id));
            this.rooms.delete(room.id);
        }
    }

    public close() {
        for (const room of this.rooms.values()) room.destroy();
        for (const player of this.waitingQueue) player.disconnect();
        this.waitingQueue = [];
        this.rooms.clear();
        this.playerToRoomMap.clear();
    }
}
