import { FastifyPluginAsync } from "fastify";

const serverRoutes: FastifyPluginAsync = async (app) => {
    app.get("/check", async (request, reply) => {
        return;
    });

    app.post(
        "/play/upload_result",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true }
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const {
                chart_id,
                score,
                grade,
                combo,
                max_combo,
                decrypted_plus_count,
                decrypted_count,
                received_count,
                lost_count,
            } = request.body as {
                chart_id: string,
                score: number,
                grade: number,
                combo: number,
                max_combo: number,
                decrypted_plus_count: number,
                decrypted_count: number,
                received_count: number,
                lost_count: number,
            };

            const newResultEntry = await app.playService.submitPlay(
                request.user,
                chart_id,
                score,
                grade,
                combo,
                max_combo,
                decrypted_plus_count,
                decrypted_count,
                received_count,
                lost_count
            );

            const bestResult = await app.playService.getChartBestPlay(request.user, chart_id);
            const is_best = bestResult!.score == score;
            const statsMap = await app.playService.getChartPlayStatsForCharts(request.user, [chart_id]);
            const stats = statsMap[chart_id] ?? { playTimes: 0, totalDecrypted: 0, totalReceived: 0, totalLost: 0 };

            return {
                status: "OK",

                result_id: newResultEntry._id,
                play_statistic: {
                    decrypted: stats.totalDecrypted,
                    received: stats.totalReceived,
                    lost: stats.totalLost,
                    play_times: stats.playTimes
                },
                rating: request.user.rating,
                
                is_best,
                best_result: {
                    create_time: bestResult!.createdAt.getTime() / 1000,

                    chart_id,

                    score: bestResult!.score,
                    grade: bestResult!.grade,
                    rating: bestResult!.rating,

                    decrypted_plus_count: bestResult!.stats.decrypted_plus,
                    decrypted_count: bestResult!.stats.decrypted,
                    received_count: bestResult!.stats.received,
                    lost_count: bestResult!.stats.lost
                },
            }
        }
    );

    app.get(
        "/maimaipass_event/status",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            return { status: 'OK', amount: 200, is_purchased: false };
        }
    );

    app.get(
        "/play/get_best",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const bestPlays = await app.playService.getBestPlays(request.user);
            if (!bestPlays || bestPlays.length === 0) {
                return { status: "OK", data: [] };
            }

            const chartIds = bestPlays.map(p => p.chartId);
            const statsMap = await app.playService.getChartPlayStatsForCharts(request.user, chartIds);

            const data = bestPlays.map(play => {
                const stats = statsMap[play.chartId] ?? { playTimes: 0, totalDecrypted: 0, totalReceived: 0, totalLost: 0 };

                return {
                    create_time: play.createdAt.getTime() / 1000,

                    chart_id: play.chartId,

                    score: play.score,
                    grade: play.grade,
                    rating: play.rating,
                    max_rating: stats.maxRating,

                    combo: play.combo,
                    max_combo: play.maxCombo,
                    decrypted_count: play.stats.decrypted,
                    decrypted_plus_count: play.stats.decrypted_plus,
                    received_count: play.stats.received,
                    lost_count: play.stats.lost,
                    
                    play_statistic: {
                        decrypted: stats.totalDecrypted,
                        received: stats.totalReceived,
                        lost: stats.totalLost,
                        play_times: stats.playTimes
                    },
                };
            });

            return { status: "OK", data };
        }
    );
};

export default serverRoutes;