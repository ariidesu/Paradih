import { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { randomUUID } from "crypto";
import { ClientMessage, ClientUpdateScoreMessage, ServerMessage } from "./types";

export interface PlayerInfo {
    id: string;
    connectionId: string;
    username: string;
    usernameMask: string;
    level: number;
    rating: number;
    battleRating: number;
    isPrdOnline: boolean;
    style: { skin: string; bg: string; title: string };
}

export interface LinkerPlayResultData {
    roomId: string;
    roundStartedAt: string;
    chartId: string;
    createdAt: string;
    score: number;
    grade: number;
    combo: number;
    maxCombo: number;
    stats: {
        decrypted_plus: number;
        decrypted: number;
        received: number;
        lost: number;
    };
}

export type LinkerForwardMessage = {
    linker: true;
    playerInfo: PlayerInfo;
    playResult?: LinkerPlayResultData;
    message: ClientMessage;
}

export type LinkerToUserMessage = {
    linker: true;
    targetPlayerId: string;
    targetConnectionId: string;
    message: ServerMessage;
}

export class LinkerClient {
    private app: FastifyInstance;
    private linkerSocket: WebSocket | null = null;
    private userSockets = new Map<string, WebSocket>();
    private userInfo = new Map<string, PlayerInfo>();
    private rounds = new Map<string, { roomId: string; chartId?: string; startedAt?: number }>();

    private pendingScores = new Map<string, ClientUpdateScoreMessage>();
    private scoreIntervals = new Map<string, NodeJS.Timeout>();

    private heartbeatInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isReconnecting = false;
    private stopped = false;
    private processing = Promise.resolve();

    private static readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
    private static readonly RECONNECT_DELAY = 5000; // 5 seconds

    constructor(app: FastifyInstance) {
        this.app = app;
    }

    public async connect(): Promise<void> {
        if (this.stopped) return;
        const linkerUrl = this.app.config.CROSS_DECODE_LINKER_URL;
        const token = this.app.config.CROSS_DECODE_LINKER_TOKEN;

        console.log(`Connecting to linker at ${linkerUrl}...`);

        const socket = new WebSocket(linkerUrl, {
            headers: {
                "auth-token": token
            }
        });
        this.linkerSocket = socket;

        socket.on("open", () => {
            if (this.stopped || this.linkerSocket !== socket) {
                socket.terminate();
                return;
            }
            console.log("Connected to linker");
            this.linkerSocket = socket;
            this.isReconnecting = false;
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
            this.startHeartbeat();
        });

        socket.on("message", (data) => {
            this.processing = this.processing.then(async () => {
                if (this.stopped || this.linkerSocket !== socket) return;
                try {
                    const message = JSON.parse(data.toString());
                    if (message.linker && message.targetPlayerId) {
                        await this.handleLinkerMessage(message as LinkerToUserMessage);
                    }
                } catch (error) {
                    console.error("Error processing linker message:", error);
                }
            });
        });

        socket.on("close", () => {
            if (this.linkerSocket === socket) this.clearLinkerSocket();
        });

        socket.on("error", (err) => {
            console.error("Linker socket error:", err);
            if (this.linkerSocket === socket) this.clearLinkerSocket();
        });

        socket.on("pong", () => {});
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.linkerSocket?.readyState === 1) {
                this.linkerSocket.ping();
            }
        }, LinkerClient.HEARTBEAT_INTERVAL);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    public clearLinkerSocket(): void {
        if (!this.linkerSocket) return;
        const linkerSocket = this.linkerSocket;

        console.log("Linker disconnected, closing all user connections");
        this.stopHeartbeat();

        for (const [playerId, socket] of this.userSockets) {
            if (socket.readyState == 1) {
                socket.close();
            }
            this.cleanupPlayer(playerId);
        }
        this.userSockets.clear();
        this.userInfo.clear();
        this.rounds.clear();
        this.linkerSocket = null;
        linkerSocket.terminate();
        this.isReconnecting = false;

        this.scheduleReconnect();
    }

    private scheduleReconnect(): void {
        if (this.stopped || this.isReconnecting || this.reconnectTimeout || this.isConnected()) {
            return;
        }

        console.log(`Scheduling reconnect to linker in ${LinkerClient.RECONNECT_DELAY / 1000} seconds`);
        this.reconnectTimeout = setTimeout(async () => {
            this.reconnectTimeout = null;
            this.isReconnecting = true;

            try {
                if (!this.isConnected()) {
                    await this.connect();
                }
            } catch (err) {
                console.error("Failed to connect to linker:", err);
                this.isReconnecting = false;
                this.scheduleReconnect();
            }
        }, LinkerClient.RECONNECT_DELAY);
    }

    public isConnected(): boolean {
        return this.linkerSocket !== null && this.linkerSocket.readyState == 1;
    }

    public close(): void {
        this.stopped = true;
        this.stopHeartbeat();
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
        const socket = this.linkerSocket;
        this.linkerSocket = null;
        socket?.terminate();
        for (const [playerId, userSocket] of this.userSockets) {
            userSocket.close();
            this.cleanupPlayer(playerId);
        }
        this.userSockets.clear();
        this.userInfo.clear();
        this.rounds.clear();
    }

    public async handleLinkerMessage(message: LinkerToUserMessage): Promise<void> {
        const targetSocket = this.userSockets.get(message.targetPlayerId);
        const targetPlayer = this.userInfo.get(message.targetPlayerId);
        if (!targetSocket || targetSocket.readyState !== 1 ||
            targetPlayer?.connectionId !== message.targetConnectionId) {
            console.log(`Target player ${message.targetPlayerId} not connected`);
            return;
        }

        const userMessage = message.message;
        if (userMessage.action === "matchSuccess") {
            try {
                await this.app.models.BattleParticipation.updateOne(
                    { userId: message.targetPlayerId, roomId: userMessage.data.roomId },
                    { $setOnInsert: { opponentId: userMessage.data.opponentId } },
                    { upsert: true }
                );
            } catch (error) {
                targetSocket.close();
                this.removeUser(targetPlayer);
                throw error;
            }
        }
        if (this.userSockets.get(message.targetPlayerId) !== targetSocket || targetSocket.readyState !== 1) return;
        if (userMessage.action === "matchSuccess") {
            this.rounds.set(message.targetPlayerId, { roomId: userMessage.data.roomId });
        } else {
            const round = this.rounds.get(message.targetPlayerId);
            if (round && userMessage.action === "annoFinnalChart") {
                const difficulty = ["detected", "invaded", "massive", "reboot"][userMessage.data.chartDiff];
                round.chartId = `${userMessage.data.trackId}/${difficulty}`;
            } else if (round && userMessage.action === "allPlayerReady") {
                round.startedAt ??= Date.now();
            }
        }
        userMessage.nonce ??= randomUUID();
        targetSocket.send(this.app.encryptPara(JSON.stringify(userMessage)).toString("base64"));
    }

    public addUser(playerInfo: PlayerInfo, socket: WebSocket): boolean {
        const currentSocket = this.userSockets.get(playerInfo.id);
        if (currentSocket && currentSocket !== socket && currentSocket.readyState < WebSocket.CLOSING) return false;
        if (currentSocket && currentSocket !== socket) this.removeUser(this.userInfo.get(playerInfo.id));
        this.userSockets.set(playerInfo.id, socket);
        this.userInfo.set(playerInfo.id, playerInfo);
        return true;
    }

    public removeUser(playerInfo: PlayerInfo | undefined, notifyLinker = true): void {
        if (!playerInfo || this.userInfo.get(playerInfo.id) !== playerInfo) return;
        this.userSockets.delete(playerInfo.id);
        this.userInfo.delete(playerInfo.id);
        this.rounds.delete(playerInfo.id);
        this.cleanupPlayer(playerInfo.id);

        if (notifyLinker && this.isConnected()) {
            this.forwardToLinker(playerInfo, {
                action: "cancelGame",
                timestamp: Math.floor(Date.now() / 1000),
                data: {}
            });
        }
    }

    private cleanupPlayer(playerId: string): void {
        const interval = this.scoreIntervals.get(playerId);
        if (interval) {
            clearInterval(interval);
            this.scoreIntervals.delete(playerId);
        }
        this.pendingScores.delete(playerId);
    }

    public async forwardToLinker(playerInfo: PlayerInfo, message: ClientMessage): Promise<void> {
        if (!this.isConnected()) {
            console.log("Cannot forward to linker: not connected");
            return;
        }

        if (message.action == "updateScore") {
            this.handleScoreUpdate(playerInfo, message);
            return;
        }

        const forwardMessage: LinkerForwardMessage = {
            message,
            linker: true,
            playerInfo,
        };

        if (message.action == "donePlaying") {
            const round = this.rounds.get(playerInfo.id);
            if (!round || round.startedAt === undefined) return;
            const playResult = await this.app.playService.getChartPlayByOnlyId(message.data.resultId);
            if (playResult && playResult.userId.toString() === playerInfo.id &&
                playResult.chartId === round.chartId && playResult.createdAt.getTime() >= round.startedAt) {
                forwardMessage.playResult = {
                    roomId: round.roomId,
                    roundStartedAt: new Date(round.startedAt).toISOString(),
                    chartId: playResult.chartId,
                    createdAt: playResult.createdAt.toISOString(),
                    score: playResult.score,
                    grade: playResult.grade,
                    combo: playResult.combo,
                    maxCombo: playResult.maxCombo,
                    stats: {
                        decrypted_plus: playResult.stats.decrypted_plus,
                        decrypted: playResult.stats.decrypted,
                        received: playResult.stats.received,
                        lost: playResult.stats.lost,
                    }
                };
            } else return;
            if (this.userInfo.get(playerInfo.id) !== playerInfo || !this.isConnected()) return;
            this.flushScore(playerInfo);
            this.cleanupPlayer(playerInfo.id);
        }

        this.sendToLinker(forwardMessage);
    }

    private handleScoreUpdate(playerInfo: PlayerInfo, message: ClientUpdateScoreMessage): void {
        this.pendingScores.set(playerInfo.id, message);

        if (!this.scoreIntervals.has(playerInfo.id)) {
            this.flushScore(playerInfo);
            const interval = setInterval(() => this.flushScore(playerInfo), 300);
            interval.unref();
            this.scoreIntervals.set(playerInfo.id, interval);
        }
    }

    private flushScore(playerInfo: PlayerInfo): void {
        const message = this.pendingScores.get(playerInfo.id);
        if (!message || !this.isConnected()) return;
        this.pendingScores.delete(playerInfo.id);
        this.sendToLinker({ linker: true, playerInfo, message });
    }

    private sendToLinker(message: LinkerForwardMessage): void {
        if (this.linkerSocket?.readyState == 1) {
            this.linkerSocket.send(JSON.stringify(message));
        }
    }

    public getUserSocket(playerId: string): WebSocket | undefined {
        return this.userSockets.get(playerId);
    }
}
