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
            
            return {
                status: "OK",

                result_id: newResultEntry._id,
                play_statistic: {
                    decrypted: decrypted_plus_count + decrypted_count,
                    received: received_count,
                    lost: lost_count,
                    play_times: 1
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
};

export default serverRoutes;