import { FastifyInstance } from "fastify";
import { WebSocket } from "@fastify/websocket";
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
    playerId: string;
    playerInfo?: PlayerInfo;
    playResult?: LinkerPlayResultData;
} & ClientMessage;

export type LinkerToUserMessage = {
    linker: true;
    targetPlayerId: string;
} & ServerMessage;

export type LinkerIdentifyMessage = {
    linker: true;
    action: "identify";
    token: string;
};

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

    public async register(): Promise<void> {
        const linkerUrl = this.app.config.CROSS_DECODE_LINKER_URL;
        const battleSocketUrl = this.app.config.CROSS_DECODE_LINKER_CONNECT_URL;
        const token = this.app.config.CROSS_DECODE_LINKER_TOKEN;
        
        console.log(`Registering with linker at ${linkerUrl}...`);

        const response = await fetch(linkerUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ battleSocketUrl })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: "Unknown error" }));
            throw new Error(`Failed to register with linker: ${response.status} ${error.error}`);
        }

        console.log("Registered with linker, waiting for connection...");
    }

    public verifyLinkerToken(token: string): boolean {
        return token == this.app.config.CROSS_DECODE_LINKER_TOKEN;
    }

    public isLinkerMessage(message: any): message is LinkerIdentifyMessage | LinkerToUserMessage {
        return message && message.linker == true;
    }

    public isLinkerIdentify(message: any): message is LinkerIdentifyMessage {
        return message && message.linker == true && message.action == "identify";
    }

    public setLinkerSocket(socket: WebSocket): void {
        this.linkerSocket = socket;
        this.isReconnecting = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        console.log("Linker connected");
        this.startHeartbeat();
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
                    await this.register();
                    console.log("Re-registered with linker, waiting for connection...");
                }
            } catch (err) {
                console.error("Failed to re-register with linker:", err);
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

        const userMessage: ServerMessage = { ...message };
        delete (userMessage as any).linker;
        delete (userMessage as any).targetPlayerId;

        userMessage.status = "ok";
        userMessage.nonce = randomUUID();
        targetSocket.send(this.app.encryptPara(JSON.stringify(userMessage)).toString("base64"));
    }

    public addUser(playerId: string, socket: WebSocket, playerInfo: PlayerInfo): void {
        this.userSockets.set(playerId, socket);
        this.userInfo.set(playerId, playerInfo);
    }

    public removeUser(playerId: string): void {
        this.userSockets.delete(playerId);
        this.userInfo.delete(playerId);
        this.cleanupPlayer(playerId);

        if (this.isConnected()) {
            this.sendToLinker({
                linker: true,
                playerId,
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

    public async forwardToLinker(playerId: string, message: ClientMessage): Promise<void> {
        if (!this.isConnected()) {
            console.log("Cannot forward to linker: not connected");
            return;
        }

        if (message.action == "updateScore") {
            this.handleScoreUpdate(playerId, message.data as UpdateScoreData);
            return;
        }

        const forwardMessage = {
            ...message,
            linker: true,
            playerId,
        } as LinkerForwardMessage;

        if (message.action == "startMatch") {
            forwardMessage.playerInfo = this.userInfo.get(playerId);
        }

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

    private handleScoreUpdate(playerId: string, scoreData: UpdateScoreData): void {
        this.lastScoreData.set(playerId, scoreData);

        if (!this.scoreIntervals.has(playerId)) {
            const interval = setInterval(() => {
                const lastScore = this.lastScoreData.get(playerId);
                if (lastScore && this.isConnected()) {
                    this.sendToLinker({
                        linker: true,
                        playerId,
                        action: "updateScore",
                        timestamp: Date.now(),
                        data: lastScore
                    });
                }
            }, 300);

            this.scoreIntervals.set(playerId, interval);
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
