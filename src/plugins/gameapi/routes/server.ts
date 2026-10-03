import { FastifyInstance, FastifyPluginAsync } from "fastify";
import type { UserDoc } from "../../../common/models/User";

function isParadigmOnlineActive(app: FastifyInstance, user: UserDoc): boolean {
    return (
        app.config.PARADIGM_ONLINE_ENABLED &&
        (app.config.PARADIGM_ONLINE_FORCE_ACTIVE ||
            (user.prdOnline && user.prdOnlineTime > Math.floor(Date.now() / 1000)))
    );
}

function getChartMaxRating(app: FastifyInstance, chartId: string): number {
    const [prefix, songName, difficulty] = chartId.split("/");
    const songData = app.gameDataService.getSongData(`${prefix}/${songName}`);
    if (!songData || !(difficulty in songData.charts)) {
        return -1;
    }

    const chartConst = songData.charts[difficulty as keyof typeof songData.charts];
    return Math.floor((chartConst + 1) * 1000 + 0.00002);
}

interface UploadResultRequest {
    chart_id: string;
    score: number;
    grade: number;
    combo: number;
    max_combo: number;
    decrypted_plus_count: number;
    decrypted_count: number;
    received_count: number;
    lost_count: number;
}

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

            const body = request.body as Partial<UploadResultRequest> | undefined;
            const numericFields: (keyof Omit<UploadResultRequest, "chart_id">)[] = [
                "score",
                "grade",
                "combo",
                "max_combo",
                "decrypted_plus_count",
                "decrypted_count",
                "received_count",
                "lost_count",
            ];
            if (
                !body ||
                typeof body.chart_id !== "string" ||
                numericFields.some(
                    (field) =>
                        typeof body[field] !== "number" ||
                        !Number.isFinite(body[field]),
                )
            ) {
                return { status: "error", msg: "Missing info" };
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
            } = body as UploadResultRequest;

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
            const paradigmOnlineActive = isParadigmOnlineActive(app, request.user);
            const { season: seasonBestPlays } =
                await app.playService.getBestPlaysBySeason(request.user);
            seasonBestPlays.sort((a, b) => b.rating - a.rating);
            const is_b15 =
                paradigmOnlineActive &&
                is_best &&
                bestResult!.createdAt.getTime() === newResultEntry.createdAt.getTime() &&
                seasonBestPlays
                    .slice(0, 15)
                    .some((play) => play.chartId === chart_id);

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
                single_rating: paradigmOnlineActive ? newResultEntry.rating : -1,
                is_b15,
                max_rating: paradigmOnlineActive
                    ? getChartMaxRating(app, chart_id)
                    : -1,
                
                is_best,
                best_result: {
                    create_time: bestResult!.createdAt.getTime() / 1000,

                    chart_id,

                    score: bestResult!.score,
                    grade: bestResult!.grade,
                    rating: bestResult!.rating,
                    combo: bestResult!.combo,
                    max_combo: bestResult!.maxCombo,

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

            return { status: 'OK', amount: 0, is_purchased: false };
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
            const paradigmOnlineActive = isParadigmOnlineActive(app, request.user);

            const data = bestPlays.map(play => {
                const stats = statsMap[play.chartId] ?? { playTimes: 0, totalDecrypted: 0, totalReceived: 0, totalLost: 0 };
                const maxRating = paradigmOnlineActive
                    ? getChartMaxRating(app, play.chartId)
                    : -1;

                return {
                    create_time: play.createdAt.getTime() / 1000,

                    chart_id: play.chartId,

                    score: play.score,
                    grade: play.grade,
                    rating: play.rating,
                    max_rating: maxRating,

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
