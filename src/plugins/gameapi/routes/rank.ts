import { FastifyPluginAsync } from "fastify";

interface RankQueryInfo {
    id: string;
    clear_state: number;
    fc_ad_state: number;
    get_reward_id_list: string[];
    max_view_chart_count: number;
    pass_star_count: number;
    play_cost: number;
    result_total_score: number;
}

interface ContestInfo {
    contest_id: string;
    stage: number;
}

interface RankListEntry {
    is_new: boolean;
    is_time_limited: boolean;
    id: string;
    level: number;
    type: number;
    diff_type: number;
    until_time: number;
    play_cost_type: number;
    max_hp: number;
    borders: [number, number];
    star_borders: [number, number];
    chart_list: string[];
    challenge_reward: {
        id: string;
        condition_params: string[];
        reward_params: string[];
    }[];
    unlock_tag: Record<string, string[]>;
    gauge_type: number;
    decrypted: number;
    received: number;
    lost: number;
}

const rankRoutes: FastifyPluginAsync = async (app) => {
    app.get(
        "/special_rank_remain",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            return {
                status: "ok",
                data: [
                    "special_megarex_02",
                    "special_megarex_01",
                    "special_lanota_02",
                    "special_lanota_01",
                    "special_finding_hoppe_02",
                    "special_finding_hoppe_01",
                    "special_voez_02",
                    "special_voez_01",
                    "special_cytus2_02",
                    "special_cytus2_01",
                    "special_wacca_02",
                    "special_wacca_01",
                    "special_megarex2_02",
                    "special_megarex2_01",
                ].map((id) => ({
                    id,
                    is_time_limited: false,
                    until_time: 0,
                })).concat([
                    {
                        id: "special_diversesystem_02",
                        is_time_limited: true,
                        until_time: 1792728000,
                    },
                    {
                        id: "special_diversesystem_01",
                        is_time_limited: true,
                        until_time: 1792728000,
                    },
                ]),
            };
        },
    );

    app.get(
        "/list",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const data: RankListEntry[] = [];
            for (const item of app.gameDataService.getRanks()) {
                let playCostType = 1;
                if (item.playCostType == "dp") {
                    playCostType = 1;
                }

                data.push({
                    is_new: false,
                    is_time_limited: item.untilTime > 0,

                    id: item.id,
                    level: item.level,
                    type: item.type,
                    diff_type: item.id.endsWith("_01") ? 2 : item.id.endsWith("_02") ? 1 : 0,
                    until_time: item.untilTime,
                    play_cost_type: playCostType,
                    max_hp: 1000000,

                    borders: item.borders,
                    star_borders: item.starBorders,

                    chart_list: item.charts,
                    challenge_reward: item.rewards.map((reward) => {
                        const rewardMapping: { [key: string]: string } = {
                            dp: "0",
                            title: "1",
                            background: "2",
                        };
                        return {
                            id: reward.id,
                            condition_params: ["1", reward.star.toString()],
                            reward_params: [
                                rewardMapping[reward.reward.type],
                                reward.reward.value.toString(),
                            ],
                        };
                    }),
                    unlock_tag: item.unlockTag,

                    gauge_type: item.gauge.type,
                    decrypted: item.gauge.values.decrypted,
                    received: item.gauge.values.received,
                    lost: item.gauge.values.lost,
                });
            }

            return { status: "ok", data };
        },
    );

    app.post(
        "/query_info",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const body = request.body as { rank_id_list?: unknown } | undefined;
            const rankIdList = body?.rank_id_list;
            if (
                !Array.isArray(rankIdList) ||
                !rankIdList.every((rankId): rankId is string => typeof rankId === "string")
            ) {
                return { status: "error", msg: "Missing info" };
            }

            if (rankIdList.length === 0) {
                return {
                    status: "ok",
                    data: [] as RankQueryInfo[],
                    contest_info: {
                        contest_id: "",
                        stage: 1,
                    } satisfies ContestInfo,
                };
            }

            const knownRankIds = new Set(app.gameDataService.getRanks().map((rank) => rank.id));
            if (rankIdList.some((rankId) => !knownRankIds.has(rankId))) {
                return { status: "error", msg: "Rank not found" };
            }

            const data: RankQueryInfo[] = rankIdList.map((rankId) => {
                const result = request.user!.ranksResult.find((item) => item.id === rankId);
                const rankData = app.gameDataService.getRankData(rankId)!;

                return {
                    id: rankId,
                    clear_state: result?.clearState ?? 0,
                    fc_ad_state: result?.fcAdState ?? 0,
                    get_reward_id_list: result?.claimedRewards ?? [],
                    max_view_chart_count: result?.maxViewChartCount ?? 0,
                    pass_star_count: result?.passedStars ?? 0,
                    play_cost: rankData.cost,
                    result_total_score: result?.totalScore ?? 0,
                };
            });

            return {
                status: "ok",
                data,
                contest_info: {
                    contest_id: "",
                    stage: 1,
                } satisfies ContestInfo,
            };
        },
    );

    app.post(
        "/start_play",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const body = request.body as { rank_id?: unknown } | undefined;
            if (typeof body?.rank_id !== "string") {
                return { status: "error", msg: "Missing info" };
            }
            const rank_id = body.rank_id;
            const rankData = app.gameDataService.getRankData(rank_id);
            if (!rankData) {
                return { status: "error", msg: "Rank not found" };
            }
            if (rankData.cost > request.user.eco[rankData.playCostType]) {
                return { status: "failed" };
            }

            await app.userService.addEconomy(request.user, rankData.playCostType, -rankData.cost);
            const newSession = await app.rankPlayService.createRankPlay(
                request.user,
                rank_id,
            );

            // Yes, we are basically overwriting the session
            // Regardless of if there exists a session already
            // Shitty behavior, but works for our case.
            // We will just treat the existing session as finished.
            await app.userService.setRankSession(
                request.user,
                newSession._id as string,
            );

            return { status: "ok", play_id: newSession._id };
        },
    );

    app.post(
        "/rank_result",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }
            const body = request.body as {
                play_id?: unknown;
                is_passed?: unknown;
                pass_star_count?: unknown;
                get_reward_list?: unknown;
                result_id_list?: unknown;
            } | undefined;
            if (
                typeof body?.play_id !== "string" ||
                typeof body?.is_passed !== "boolean" ||
                typeof body.pass_star_count !== "number" ||
                !Number.isFinite(body.pass_star_count) ||
                !Array.isArray(body.get_reward_list) ||
                !body.get_reward_list.every((id): id is string => typeof id === "string") ||
                !Array.isArray(body.result_id_list) ||
                !body.result_id_list.every((id): id is string => typeof id === "string")
            ) {
                return { status: "error", msg: "Missing info" };
            }
            const playId = body.play_id;
            if (request.user.currentRankSession == "") {
                return { status: "failed" };
            }
            if (playId !== request.user.currentRankSession) {
                return { status: "failed" };
            }

            const {
                is_passed,
                pass_star_count,
                get_reward_list,
                result_id_list,
            } = body;

            const playData =
                await app.rankPlayService.getCurrentRankPlaySession(
                    request.user,
                );
            // This shouldn't be happening, but just in case.
            if (!playData) {
                return { status: "failed" };
            }

            let totalScore = playData.score,
                passedStars = pass_star_count,
                maxViewChartCount = result_id_list.length,
                claimedRewards = [] as string[],
                clearState = 0;
            const existingData = app.userService.findRankResultById(
                request.user,
                playData.rankId,
            );
            if (existingData) {
                totalScore = Math.max(totalScore, existingData.totalScore);
                passedStars = Math.max(passedStars, existingData.passedStars);
                maxViewChartCount = Math.max(
                    maxViewChartCount,
                    existingData.maxViewChartCount,
                );
                claimedRewards = existingData.claimedRewards;
                clearState = existingData.clearState;
            }

            // If clearState isn't 2 (basically "cleared"), we deduce it based on is_passed
            if (clearState != 2) {
                clearState = is_passed ? 2 : 1;
            }

            let gotNewStyle = false;
            // Add rewards gaming
            const rankData = app.gameDataService.getRankData(playData.rankId)!;
            const rewards = rankData.rewards;
            for (const reward of rewards) {
                if (claimedRewards.includes(reward.id) || get_reward_list.includes(reward.id)) {
                    continue;
                }
                if (reward.star > passedStars) {
                    continue;
                }

                claimedRewards.push(reward.id);

                try {
                    if (reward.reward.type == "dp") {
                        await app.userService.addEconomy(request.user, "dp", reward.reward.value as number);
                    } else if (reward.reward.type == "title") {
                        await app.userService.addOwnedItem(request.user, "titles", reward.reward.value as string);
                        gotNewStyle = true;
                    } else if (reward.reward.type == "background") {
                        await app.userService.addOwnedItem(request.user, "backgrounds", reward.reward.value as string);
                        gotNewStyle = true;
                    }
                } catch (_) {}
            }

            // Now we fetch all our play results to see if we have a full FC/AD play.
            let fcAdState = 0;
            let fcCount = 0;
            let adCount = 0;
            for (const playId of playData.resultIds) {
                const playResult = await app.playService.getChartPlayById(
                    request.user,
                    playId,
                );
                if (!playResult) {
                    break;
                }

                if (playResult.stats.lost == 0) {
                    fcCount++;
                    if (playResult.stats.received == 0) {
                        adCount++;
                    }
                }
            }
            if (adCount == playData.resultIds.length) {
                fcAdState = 2;
            } else if (fcCount == playData.resultIds.length) {
                fcAdState = 1;
            }

            await app.userService.setRankResult(
                request.user,
                playData.rankId,
                totalScore,
                clearState,
                fcAdState,
                passedStars,
                maxViewChartCount,
                claimedRewards,
            );

            let maxClear = 0;
            for (const result of request.user.ranksResult) {
                if (result.clearState == 2 && result.id.startsWith("common_season02_")) {
                    const suffix = Number.parseInt(result.id.split("_").pop() || "0", 10);
                    if (Number.isFinite(suffix)) {
                        maxClear = Math.max(maxClear, suffix);
                    }
                }
            }

            await app.userService.updateMaxClearedCommonChallenge(request.user, maxClear);
            await app.userService.setRankSession(request.user, "");

            const newResult = await app.userService.findRankResultById(request.user, playData.rankId);

            return {
                status: "ok",

                eco: {
                    ac: request.user.eco.ac,
                    dp: request.user.eco.dp,
                    navi: request.user.eco.navi,
                },
                has_new_style: gotNewStyle,
                max_clear_common_challenge: maxClear,
                
                rank_query_info: newResult && {
                    id: playData.rankId,
                    clear_state: newResult.clearState,
                    fc_ad_state: newResult.fcAdState,
                    get_reward_id_list: newResult.claimedRewards,
                    is_passed: newResult.clearState == 2 ? true : null,
                    max_view_chart_count: newResult.maxViewChartCount,
                    pass_star_count: newResult.passedStars,
                    play_cost:
                        app.gameDataService.getRankData(playData.rankId)?.cost ?? 0,
                    result_total_score: newResult.totalScore,
                },
            }
        },
    );
};

export default rankRoutes;
