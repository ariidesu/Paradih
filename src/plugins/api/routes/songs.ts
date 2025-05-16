import { FastifyPluginAsync } from "fastify";

const songsRoutes: FastifyPluginAsync = async (app) => {
    app.get(
        "/query", 
        { preHandler: app.authService.verifyApiKey },
        async (request, reply) => {
            const { query } = request;
            const { title, songId, songIds } = query as { title?: string, songId?: string, songIds?: string };
            if (title != undefined) {
                const data = app.gameDataService.getSongs().filter((song) => song.title.toLowerCase().includes(title.toLowerCase()));
                return { code: "OK", data };
            } else if (songId != undefined) {
                const data = app.gameDataService.getSongData(`s/${songId}`);
                return { code: "OK", data };
            } else if (songIds != undefined) {
                const ids = songIds.split(",").map((id) => `s/${id.trim()}`);
                const data = app.gameDataService.getSongs().filter((song) => ids.includes(song.songId));
                return { code: "OK", data };
            } else {
                const data = app.gameDataService.getSongs();
                return { code: "OK", data };
            }
        }
    );
}

export default songsRoutes;