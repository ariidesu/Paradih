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
            const playerRank = await app.models.User.countDocuments({
                $or: [
                    { battleRating: { $gt: request.user.battleRating } },
                    { $and: [ { battleRating: request.user.battleRating } ] },
                ],
            });
            return {
                status: "ok",
                code: "OK",

                data: {
                    isEnableBattle: battleData.enabled,
                    timeSlot: battleData.timeSlots,
                    annoucement: "",

                    battleRating: request.user.battleRating,
                    battleRatingRank: playerRank + 1,

                    isBanned: request.user.battleBanned,
                    unbanTime: request.user.battleBanUntil.getUTCSeconds(),
                },
            };
        }
    );

    app.get(
        "/rank_list",
        {
            preHandler: app.authService.verifyBattleToken,
        },
        async (request, reply) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const users = await app.models.User.find().sort({ battleRating: -1 });
            const rankList = [];
            for (let i = 0; i < users.length; i++) {
                const user = users[i];
                const userSave = (await app.userSaveService.getSave(user)).data;
                const activeCharacter = (userSave.get("/dict/currentCharacter") as string) ?? "para";
                const activeSkin = (userSave.get(`/dict/skin/active/${activeCharacter}`) as string) ?? "para/default";
                rankList.push({
                    rank: i + 1,
                    username: user.username,
                    usernameMask: user.usernameCode.toString(),
                    styleInfo: {
                        backgroundId: user.style.background,
                        titleId: user.style.title,
                        skinId: activeSkin,
                    },
                    rating: user.battleRating
                });
            }

            return {
                status: "ok",
                code: "OK",
                data: { rankList },
            };
        }
    )
};

export default battleApp;