import { FastifyPluginAsync } from "fastify";

const prdonlineRoutes: FastifyPluginAsync = async (app) => {
    const { User } = app.models;

    app.get(
        "/purchase_list",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async () => {
            return {
                status: "OK",
                purchased_infos: app.gameDataService.getPrdOnlinePurchases().map(p => ({
                    price: p.price,
                    days: p.days,
                    reward_point: p.rewardPoint,
                    gear: p.gear
                }))
            };
        }
    );

    app.get(
        "/get_b50",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const { season: latestSeasonPlays, nonSeason: otherPlays } = await app.playService.getPlaysBySeason(request.user);
            latestSeasonPlays.sort((a, b) => b.rating - a.rating);
            otherPlays.sort((a, b) => b.rating - a.rating);

            latestSeasonPlays.sort((a, b) => b.rating - a.rating);
            otherPlays.sort((a, b) => b.rating - a.rating);

            const topLatestSeasonPlays = latestSeasonPlays.slice(0, 15).map((play, i) => {
                const [prefix, songName, difficulty] = play.chartId.split("/");
                const parsedDifficulty = app.gameDataService.difficultyStringToNumber(difficulty);
                const songId = `${prefix}/${songName}`;
                return { index: i + 1, id: songId, difficulty: parsedDifficulty, score: play.score, rating: play.rating, grade: play.grade };
            });
            const topOtherPlays = otherPlays.slice(0, 35).map((play, i) => {
                const [prefix, songName, difficulty] = play.chartId.split("/");
                const parsedDifficulty = app.gameDataService.difficultyStringToNumber(difficulty);
                const songId = `${prefix}/${songName}`;
                return { index: i + 1, id: songId, difficulty: parsedDifficulty, score: play.score, rating: play.rating, grade: play.grade };
            });

            const bestPlays = [...topLatestSeasonPlays, ...topOtherPlays];

            const highestRating = bestPlays?.length
                ? Math.max(...bestPlays.map(p => p.rating))
                : 0;

            return { status: "OK", past: topOtherPlays, now: topLatestSeasonPlays, highest_rating: highestRating };
        }
    );

    app.post(
        "/purchase",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const { gear } = request.body as { gear: number };

            const tier = app.gameDataService.getPrdOnlinePurchases().find(p => p.gear === gear);
            if (!tier) {
                return { status: "failed" };
            }
            if (request.user.eco.ac < tier.price) {
                return { status: "failed" };
            }

            await app.userService.addEconomy(request.user, "ac", -tier.price);

            const now = Math.floor(Date.now() / 1000);
            const currentExpireTime = Math.max(now, request.user.prdOnlineTime);
            const newExpireTime = currentExpireTime + tier.days * 86400;

            const updatedUser = await User.findByIdAndUpdate(
                request.user._id,
                { prdOnline: true, prdOnlineTime: newExpireTime },
                { new: true }
            );
            if (updatedUser) {
                request.user.prdOnline = true;
                request.user.prdOnlineTime = newExpireTime;
            }

            return {
                status: "OK",
                eco: {
                    ac: request.user.eco.ac,
                    dp: request.user.eco.dp,
                    navi: request.user.eco.navi,
                },
                timestamp: now,
                expire_time: newExpireTime
            };
        }
    );
};

export default prdonlineRoutes;
