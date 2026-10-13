import { FastifyPluginAsync } from "fastify";
import battleWs from "./ws";

const battleApp: FastifyPluginAsync = async (app) => {
    await app.register(battleWs);

    app.removeContentTypeParser("application/json");
    app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
        try {
            const text = body as string;
            const payload = text.trim().startsWith("{") ? text : app.decryptPara(Buffer.from(text, "base64"));
            done(null, JSON.parse(payload));
        } catch {
            done(Object.assign(new Error("Invalid battle request"), { statusCode: 400 }));
        }
    });

    app.post("/report", { preHandler: app.authService.verifyBattleToken }, async request => {
        if (!request.user) return { status: "failed", code: "USER_NOT_FOUND" };
        const body = request.body as { roomId?: unknown; timestamp?: unknown } | undefined;
        if (typeof body?.roomId !== "string" || !Number.isSafeInteger(body.timestamp)) {
            return { status: "failed", code: "INVALID_REQUEST" };
        }
        const filter = { userId: request.user._id, roomId: body.roomId };
        const participation = await app.models.BattleParticipation.findOne(filter);
        if (!participation) return { status: "failed", code: "INVALID_REQUEST" };
        const result = await app.models.BattleParticipation.updateOne(
            { ...filter, reportedAt: null },
            { $set: { reportedAt: new Date() } }
        );
        return result.modifiedCount
            ? { status: "ok", code: "OK" }
            : { status: "failed", code: "ALREADY_REPORTED" };
    });

    app.get(
        "/init_client",
        {
            preHandler: app.authService.verifyBattleToken,
        },
        async (request, reply) => {
            if (!request.user) return { status: "failed", code: "USER_NOT_FOUND" };
            const battleData = app.gameDataService.getBattleData();
            const serverTime = Math.floor(Date.now() / 1000);
            const unbanTime = Math.floor(request.user.battleBanUntil.getTime() / 1000);
            if (request.user.battleBanned && (unbanTime === 0 || unbanTime > serverTime)) {
                return { status: "error", code: "BAN", data: { reason: "", endTime: unbanTime } };
            }
            if (!battleData.enabled) {
                return { status: "error", code: "MAINTENANCE", data: { reason: "", endTime: battleData.endTime } };
            }
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
            const playerRank = await app.models.User.countDocuments({
                $or: [
                    { battleRating: { $gt: request.user.battleRating } },
                    { battleRating: request.user.battleRating, _id: { $lt: request.user._id } },
                ],
            });
            return {
                status: "ok",
                code: "OK",

                data: {
                    isEnableBattle: battleData.enabled,
                    timeSlot: battleData.timeSlots,
                    announcement: battleData.announcement ?? "",

                    battleRating: request.user.battleRating,
                    battleRatingRank: playerRank + 1,

                    isBanned: request.user.battleBanned &&
                        (request.user.battleBanUntil.getTime() === 0 || request.user.battleBanUntil.getTime() > Date.now()),
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

            const users = await app.models.User.find().sort({ battleRating: -1, _id: 1 });
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
