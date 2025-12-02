import { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { randomUUID } from "crypto";
import { ClientMessage, ServerMessage, UpdateScoreData } from "./types";

export interface PlayerInfo {
    id: string;
    username: string;
    usernameMask: string;
    level: number;
    rating: number;
    battleRating: number;
    style: { skin: string; bg: string; title: string };
}

export interface LinkerPlayResultData {
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
    message: ServerMessage;
}

export class LinkerClient {
    private app: FastifyInstance;
    private linkerSocket: WebSocket | null = null;
    private userSockets = new Map<string, WebSocket>();
    private userInfo = new Map<string, PlayerInfo>();

    private lastScoreData = new Map<string, UpdateScoreData>();
    private scoreIntervals = new Map<string, NodeJS.Timeout>();

    private heartbeatInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isReconnecting = false;

    private static readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
    private static readonly RECONNECT_DELAY = 5000; // 5 seconds

    constructor(app: FastifyInstance) {
        this.app = app;
    }

    public async connect(): Promise<void> {
        const linkerUrl = this.app.config.CROSS_DECODE_LINKER_URL;
        const token = this.app.config.CROSS_DECODE_LINKER_TOKEN;
        
        console.log(`Connecting to linker at ${linkerUrl}...`);

        const socket = new WebSocket(linkerUrl, {
            headers: {
                "auth-token": token
            }
        });

        socket.on("open", () => {
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
            try {
                const message = JSON.parse(data.toString());
                if (message.linker && message.targetPlayerId) {
                    this.handleLinkerMessage(message as LinkerToUserMessage);
                }
            } catch (error) {
                console.error("Error processing linker message:", error);
            }
        });

        socket.on("close", () => {
            this.clearLinkerSocket();
        });

        socket.on("error", (err) => {
            console.error("Linker socket error:", err);
            this.clearLinkerSocket();
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
        this.linkerSocket = null;

        this.scheduleReconnect();
    }

    private scheduleReconnect(): void {
        if (this.isReconnecting || this.reconnectTimeout || this.isConnected()) {
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

    public handleLinkerMessage(message: LinkerToUserMessage): void {
        const targetSocket = this.userSockets.get(message.targetPlayerId);
        if (!targetSocket || targetSocket.readyState !== 1) {
            console.log(`Target player ${message.targetPlayerId} not connected`);
            return;
        }
        
        const userMessage = message.message;
        userMessage.status = "ok";
        userMessage.nonce = randomUUID();
        targetSocket.send(this.app.encryptPara(JSON.stringify(userMessage)).toString("base64"));
    }

    public addUser(playerInfo: PlayerInfo, socket: WebSocket): void {
        this.userSockets.set(playerInfo.id, socket);
        this.userInfo.set(playerInfo.id, playerInfo);
    }

    public removeUser(playerId: string): void {
        const playerInfo = this.userInfo.get(playerId)!;

        this.userSockets.delete(playerId);
        this.userInfo.delete(playerId);
        this.cleanupPlayer(playerId);

        if (this.isConnected()) {
            this.forwardToLinker(playerInfo, {
                action: "cancelGame",
                timestamp: Date.now(),
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
        this.lastScoreData.delete(playerId);
    }

    public async forwardToLinker(playerInfo: PlayerInfo, message: ClientMessage): Promise<void> {
        if (!this.isConnected()) {
            console.log("Cannot forward to linker: not connected");
            return;
        }

        if (message.action == "updateScore") {
            this.handleScoreUpdate(playerInfo, message.data as UpdateScoreData);
            return;
        }

        const forwardMessage = {
            message,
            linker: true,
            playerInfo,
        } as LinkerForwardMessage;

        if (message.action == "donePlaying") {
            const playResult = await this.app.playService.getChartPlayByOnlyId(message.data.resultId);
            if (playResult) {
                forwardMessage.playResult = {
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
            }
        }

        this.sendToLinker(forwardMessage);
    }

    private handleScoreUpdate(playerInfo: PlayerInfo, scoreData: UpdateScoreData): void {
        this.lastScoreData.set(playerInfo.id, scoreData);

        if (!this.scoreIntervals.has(playerInfo.id)) {
            const interval = setInterval(() => {
                const lastScore = this.lastScoreData.get(playerInfo.id);
                if (lastScore && this.isConnected()) {
                    this.sendToLinker({
                        linker: true,
                        playerInfo,
                        message: {
                            action: "updateScore",
                            timestamp: Date.now(),
                            data: lastScore
                        }
                    });
                }
            }, 300);

            this.scoreIntervals.set(playerInfo.id, interval);
        }
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
