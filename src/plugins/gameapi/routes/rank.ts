import { FastifyPluginAsync } from "fastify";

const rankRoutes: FastifyPluginAsync = async (app) => {
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

            const data: any[] = [];
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
                    until_time: item.untilTime,
                    play_cost_type: playCostType,
                    cop_mark: false,

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

            const { rank_id_list } = request.body as { rank_id_list: string[] };

            const data: any[] = request.user.ranksResult.map((item) => {
                if (rank_id_list.length > 0 && !rank_id_list.includes(item.id)) {
                    return null; // Filter out items not in the requested list
                }
                return {
                    id: item.id,
                    clear_state: item.clearState,
                    fc_ad_state: item.fcAdState,
                    get_reward_id_list: item.claimedRewards,
                    is_passed: item.clearState == 2 ? true : null, // Original API returned null for false, so just a precaution.
                    max_view_chart_count: item.maxViewChartCount,
                    pass_star_count: item.passedStars,
                    play_cost:
                        app.gameDataService.getRankData(item.id)?.cost ?? 0,
                    result_total_score: item.totalScore,
                };
            });

            // Add default entries if they don't exist
            const allRankIds = app.gameDataService.getRanks().map((r) => r.id);
            for (const rankId of allRankIds) {
                if (!data.some((item) => item && item.id === rankId) && rank_id_list.includes(rankId)) {
                    const rankData = app.gameDataService.getRankData(rankId);
                    if (rankData) {
                        data.push({
                            id: rankId,
                            clear_state: 0,
                            fc_ad_state: 0,
                            get_reward_id_list: [],
                            is_passed: null,
                            max_view_chart_count: 0,
                            pass_star_count: 0,
                            play_cost: rankData.cost,
                            result_total_score: 0,
                        });
                    }
                }
            }

            return { status: "ok", data };
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

            const { rank_id } = request.body as { rank_id: string };
            const newSession = await app.rankPlayService.createRankPlay(
                request.user,
                rank_id,
            );

            // Yes, we are basically overwriting the session
            // Regardless of if there exists a session already
            // Shitty behavior, but works for our case.
            // We will just treat the existing session as finished.
            app.userService.setRankSession(
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
            if (request.user.currentRankSession == "") {
                return { status: "failed" };
            }

            const {
                is_passed,
                pass_star_count,
                get_reward_list,
                result_id_list,
            } = request.body as {
                is_passed: boolean;
                pass_star_count: number;
                get_reward_list: string[];
                result_id_list: string[];
            };

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
                clearState = 0, alreadyClaimed = 0;
            const existingData = app.userService.findRankResultById(
                request.user,
                playData.id,
            );
            if (existingData) {
                totalScore = Math.max(totalScore, existingData.totalScore);
                passedStars = Math.max(passedStars, existingData.passedStars);
                maxViewChartCount = Math.max(
                    maxViewChartCount,
                    existingData.maxViewChartCount,
                );
                claimedRewards = existingData.claimedRewards;
                alreadyClaimed = claimedRewards.length;
                clearState = existingData.clearState;
            }

            // If clearState isn't 2 (basically "cleared"), we deduce it based on is_passed
            if (clearState != 2) {
                clearState = is_passed ? 2 : 1;
            }

            // Add rewards gaming
            const rankData = app.gameDataService.getRankData(playData.id)!;
            const rewards = rankData.rewards;
            for (const reward of rewards) {
                if (claimedRewards.includes(reward.id) || !get_reward_list.includes(reward.id)) {
                    continue;
                }
                if (reward.star > passedStars) {
                    continue;
                }

                if (reward.reward.type === "dp") {
                    await app.userService.addEconomy(request.user, "dp", reward.reward.value as number);
                } else if (reward.reward.type === "title") {
                    await app.userService.addOwnedItem(request.user, "titles", reward.reward.value as string);
                } else if (reward.reward.type === "background") {
                    await app.userService.addOwnedItem(request.user, "backgrounds", reward.reward.value as string);
                }
                claimedRewards.push(reward.id);
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

            let maxClear = 0;
            for (const result of request.user.ranksResult) {
                if (result.clearState == 2 && result.id.startsWith("common_season02_")) {
                    try {
                        const suffix = parseInt(result.id.split("_").pop() || "0");
                        maxClear = Math.max(maxClear, suffix);
                    } catch (_) {
                    }
                }
            }

            await app.userService.updateMaxClearedCommonChallenge(request.user, maxClear);

            await app.userService.setRankResult(
                request.user,
                playData.id,
                totalScore,
                clearState,
                fcAdState,
                passedStars,
                maxViewChartCount,
                claimedRewards,
            );
            await app.userService.setRankSession(request.user, "");

            return {
                status: "ok",
                eco: request.user.eco,
                has_new_style: claimedRewards.length > alreadyClaimed,
                max_clear_common_challenge: maxClear,
                rank_query_info: await app.userService.findRankResultById(request.user, playData.id),
            }
        },
    );
};

export default rankRoutes;
