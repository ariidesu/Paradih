export type BaseMessage = {
    linker?: boolean;
    action: string;
    nonce?: string;
}


// Cross Decode messages

export type UpdateScoreData = {
    score: number;
    totalNote: number;
    near: number;
    received: number;
    lost: number;
    hasMiss: boolean;
};

export type ClientBaseMessage = BaseMessage & { timestamp: number }
export type ServerBaseMessage = BaseMessage & { status: "ok" | "fail" }

export type ServerMatchConfirmMessage = ServerBaseMessage & {
    status: "ok";
    action: "matchConfirm";
    data: {}
}

export type ServerMatchSuccessMessage = ServerBaseMessage & {
    status: "ok";
    action: "matchSuccess";
    data: {
        roomId: string;
        chartInfo: {
            trackList: string[],
            diffList: number[],
            chartSpeacialEffectList: (number | null)[];
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
        opponentIsPrdOnline: boolean;
    };
}

export type ServerAnnounceFinalMessage = ServerBaseMessage & {
    status: "ok",
    action: "annoFinnalChart",
    data: {
        banChartIndex: number[];
        trackId: string;
        chartDiff: number;
        chartSpeacialEffect: number | null;
    };
}

export type ServerAllPlayerReadyMessage = ServerBaseMessage & {
    status: "ok";
    action: "allPlayerReady";
    data: {}
}

export type ServerOpponentScoreUpdateMessage = ServerBaseMessage & {
    status: "ok";
    action: "opponentScoreUpdate";
    data: UpdateScoreData;
}

export type ServerGameOverMessage = ServerBaseMessage & {
    status: "ok";
    action: "gameOver";
    data: {
        isWin: boolean | null;
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

export type ServerAcknowledgementMessage = {
    action?: never;
    status: "ok";
    code: "OK";
    nonce: string;
};

export type ServerQueueErrorMessage = {
    action?: never;
    status: "failed";
    code: "IN_BATTLE_ALREADY" | "NOT_IN_QUEUE";
    nonce: string;
};

export type ServerCancelMatchMessage = ServerBaseMessage & {
    status: "ok";
    action: "cancelMatch";
    data: { reason: "OPPONENT_CANCEL" | "SONG_NOT_ENOUGH" };
};

export type ServerOpponentOfflineMessage = ServerBaseMessage & {
    status: "ok";
    action: "opponentOffline";
    data: { reason: string };
};

export type ServerMessage = ServerMatchConfirmMessage | ServerMatchSuccessMessage | ServerAnnounceFinalMessage | ServerAllPlayerReadyMessage | ServerOpponentScoreUpdateMessage | ServerGameOverMessage | ServerAcknowledgementMessage | ServerQueueErrorMessage | ServerCancelMatchMessage | ServerOpponentOfflineMessage;

export type ClientHeartbeatMessage = ClientBaseMessage & {
    action: "heartbeat";
    data: {}
}

export type ClientStartMatchMessage = ClientBaseMessage & {
    action: "startMatch";
    data: {
        isHiddenInfo: boolean;
        isHiddenRating: boolean;
        playerLevel: number
    }
}

export type ClientCancelGameMessage = ClientBaseMessage & {
    action: "cancelGame";
    data: {}
}

export type ClientBanChartMessage = ClientBaseMessage & {
    action: "banChart";
    data: {
        chartIndex: number
    }
}

export type ClientReadyMessage = ClientBaseMessage & {
    action: "playerReady";
    data: {}
}

export type ClientUpdateScoreMessage = ClientBaseMessage & {
    action: "updateScore";
    data: UpdateScoreData
}

export type ClientDonePlayingMessage = ClientBaseMessage & {
    action: "donePlaying";
    data: {
        resultId: string;
        judgeDetails: [number, number, number, number]
    }
}

export type ClientGameOverMessage = ClientBaseMessage & {
    action: "gameIsOver";
    data: {}
}

export type ClientMessage = ClientHeartbeatMessage | ClientStartMatchMessage | ClientCancelGameMessage | ClientBanChartMessage | ClientReadyMessage | ClientUpdateScoreMessage | ClientDonePlayingMessage | ClientGameOverMessage;

export function isClientMessage(value: unknown): value is ClientMessage {
    if (typeof value !== "object" || value === null) return false;
    const message = value as Record<string, unknown>;
    if (!Number.isSafeInteger(message.timestamp) ||
        (message.nonce !== undefined && (typeof message.nonce !== "string" || message.nonce.length === 0)) ||
        typeof message.data !== "object" || message.data === null || Array.isArray(message.data)) return false;
    const data = message.data as Record<string, unknown>;
    const count = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0x7fffffff;
    switch (message.action) {
        case "heartbeat":
        case "cancelGame":
        case "gameIsOver":
        case "playerReady":
            return true;
        case "startMatch":
            return count(data.playerLevel) && typeof data.isHiddenInfo === "boolean" && typeof data.isHiddenRating === "boolean";
        case "banChart":
            return typeof data.chartIndex === "number" && Number.isInteger(data.chartIndex) && data.chartIndex >= -1;
        case "updateScore":
            return ["score", "totalNote", "near", "received", "lost"].every(key => count(data[key])) && typeof data.hasMiss === "boolean";
        case "donePlaying":
            return typeof data.resultId === "string" && data.resultId.length > 0 &&
                Array.isArray(data.judgeDetails) && data.judgeDetails.length === 4 && data.judgeDetails.every(count);
        default:
            return false;
    }
}

// Linker messages

export type LinkerMatchConfirmMessage = { linker: true, message: ServerMatchConfirmMessage };
export type LinkerMatchSuccessMessage = { linker: true, message: ServerMatchSuccessMessage };
export type LinkerAnnounceFinalMessage = { linker: true, message: ServerAnnounceFinalMessage };
export type LinkerAllPlayerReadyMessage = { linker: true, message: ServerAllPlayerReadyMessage };
export type LinkerOpponentScoreUpdateMessage = { linker: true, message: ServerOpponentScoreUpdateMessage };
export type LinkerGameOverMessage = { linker: true, message: ServerGameOverMessage };
export type LinkerServerMessage = LinkerMatchConfirmMessage | LinkerMatchSuccessMessage | LinkerAnnounceFinalMessage | LinkerAllPlayerReadyMessage | LinkerOpponentScoreUpdateMessage | LinkerGameOverMessage;
