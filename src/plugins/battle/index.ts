import { FastifyPluginAsync } from "fastify";

const battleApp: FastifyPluginAsync = async (app) => {
    app.get(
        "/init_client",
        {
            preHandler: app.authService.verifyBattleToken,
        },
        async (request, reply) => {
            const battleData = app.gameDataService.getBattleData();
            const serverTime = Date.now() / 1000; // The API would send UNIX timestamp in seconds
            return {
                status: "ok",
                code: "OK",

                data: {
                    serverTime: serverTime,

                    battleSeasonStatus: "STARTED", // TODO: Implement logic to determine the status
                    battleSeasonId: battleData.seasonId,
                    battleSeasonStartTime: battleData.seasonStartTime,
                    battleSeasonEndTime: battleData.seasonEndTime,
                    battleEndTime: battleData.endTime,

                    isNewUser: false // too lazy lol
                },
            };
        }
    );

    app.get(
        "/get_info",
        {
            preHandler: app.authService.verifyBattleToken,
        },
        async (request, reply) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const battleData = app.gameDataService.getBattleData();
            return {
                status: "ok",
                code: "OK",

                data: {
                    isEnableBattle: battleData.enabled,
                    timeSlot: battleData.timeSlots,
                    annoucement: "",

                    battleRating: request.user.battleRating,
                    battleRatingRank: 0, // TODO: Implement battle ranking

                    isBanned: request.user.battleBanned,
                    unbanTime: request.user.battleBanUntil.getUTCSeconds(),
                },
            };
        }
    );
};

export default battleApp;