import { FastifyPluginAsync } from "fastify";

const playRoutes: FastifyPluginAsync = async (app) => {
    app.get(
        "/query",
        { preHandler: app.authService.verifyApiKey },
        async (request, reply) => {
            const { query } = request;
            const { userId, songId, best } = query as { userId: string, songId?: string, best?: string };

            const isBest = best == "true" || best == "1";
            
            if (!userId) {
                reply.statusCode = 400;
                return { code: "INVALID_REQUEST", message: "User ID is required." };
            }

            const user = await app.userService.findById(userId);
            if (!user) {
                reply.statusCode = 404;
                return { code: "USER_NOT_FOUND", message: "User not found." };
            }

            const plays = isBest ? await app.playService.getBestPlays(user) : await app.playService.getAllPlays(user);
            const formattedData = plays?.map((play) => ({
                submittedAt: play.createdAt.getTime(),

                chartId: play.chartId,
                score: play.score,
                grade: play.grade,
                combo: play.combo,
                maxCombo: play.maxCombo,
                rating: play.rating,
                
                stats: {
                    decrypted: play.stats.decrypted,
                    decryptedPlus: play.stats.decrypted_plus,
                    received: play.stats.received,
                    lost: play.stats.lost,
                }
            })) || [];
            if (songId) {
                const filtered = formattedData.filter((play) => play.chartId.startsWith(songId));
                return { code: "OK", data: filtered };
            }
            return { code: "OK", data: formattedData };
        }
    )
};

export default playRoutes;