import { FastifyPluginAsync } from "fastify";
import battleWs from "./ws";

const battleApp: FastifyPluginAsync = async (app) => {
    await app.register(battleWs);

    app.get(
        "/init_client",
        {
            preHandler: app.authService.verifyBattleToken,
        },
        async (request, reply) => {
            const battleData = app.gameDataService.getBattleData();
            const serverTime = Math.floor(Date.now() / 1000);
            const seasonStatus = serverTime < battleData.seasonStartTime ? "NOT_STARTED" :
                serverTime >= battleData.seasonEndTime ? "ENDED" : "STARTED";
            return {
                status: "ok",
                code: "OK",

                data: {
                    serverTime: serverTime,

                    battleSeasonStatus: seasonStatus,
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
            const playerRank = await app.models.User.countDocuments({ battleRating: { $gt: request.user.battleRating } });
            return {
                status: "ok",
                code: "OK",

                data: {
                    isEnableBattle: battleData.enabled,
                    timeSlot: battleData.timeSlots,
                    announcement: battleData.announcement ?? "",

                    battleRating: request.user.battleRating,
                    battleRatingRank: playerRank + 1,

                    isBanned: request.user.battleBanned,
                    unbanTime: Math.floor(request.user.battleBanUntil.getTime() / 1000),
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
            const userRankIndex = users.findIndex(user => String(user._id) === String(request.user!._id)) + 1;
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
                    rating: user.battleRating,
                    isPrdOnline: app.config.PARADIGM_ONLINE_ENABLED &&
                        (app.config.PARADIGM_ONLINE_FORCE_ACTIVE ||
                            (user.prdOnline && user.prdOnlineTime > Math.floor(Date.now() / 1000)))
                });
            }

            return {
                status: "ok",
                code: "OK",
                data: { rankList, userRankIndex },
            };
        }
    )
};

export default battleApp;
