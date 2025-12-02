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

export type ServerAnnounceFinalMessage = ServerBaseMessage & {
    status: "ok",
    action: "annoFinnalChart",
    data: {
        banChartIndex: number[];
        trackId: string;
        chartDiff: number;
        chartSpeacialEffect: any;
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

export type ServerMessage = ServerMatchConfirmMessage | ServerMatchSuccessMessage | ServerAnnounceFinalMessage | ServerAllPlayerReadyMessage | ServerOpponentScoreUpdateMessage | ServerGameOverMessage;

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

// Linker messages
export type LinkerMatchConfirmMessage = { linker: true, message: ServerMatchConfirmMessage };
export type LinkerMatchSuccessMessage = { linker: true, message: ServerMatchSuccessMessage };
export type LinkerAnnounceFinalMessage = { linker: true, message: ServerAnnounceFinalMessage };
export type LinkerAllPlayerReadyMessage = { linker: true, message: ServerAllPlayerReadyMessage };
export type LinkerOpponentScoreUpdateMessage = { linker: true, message: ServerOpponentScoreUpdateMessage };
export type LinkerGameOverMessage = { linker: true, message: ServerGameOverMessage };
export type LinkerServerMessage = LinkerMatchConfirmMessage | LinkerMatchSuccessMessage | LinkerAnnounceFinalMessage | LinkerAllPlayerReadyMessage | LinkerOpponentScoreUpdateMessage | LinkerGameOverMessage;