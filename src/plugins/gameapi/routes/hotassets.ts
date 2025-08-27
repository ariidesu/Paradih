import { FastifyPluginAsync } from "fastify";

const serverRoutes: FastifyPluginAsync = async (app) => {
    // NOTE: These three doesn't exist in the actual server lol
    app.get(
        "/download_catalog/:platform",
        { preHandler: app.authService.verifyAuthToken },
        async (request, reply) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }
            
            const platform = (request.params as any).platform?.toLowerCase();
            if (platform !== "ios" && platform !== "android") {
                reply.status(400);
                return { status: "failed", code: "INVALID_PLATFORM" };
            }
            return app.gameDataService.getCatalog(platform).data;
        }
    );

    app.get(
        "/download_catalog_checksum/:platform",
        { preHandler: app.authService.verifyAuthToken },
        async (request, reply) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const platform = (request.params as any).platform?.toLowerCase();
            if (platform !== "ios" && platform !== "android") {
                reply.status(400);
                return { status: "failed", code: "INVALID_PLATFORM" };
            }
            return app.gameDataService.getCatalog(platform).checksum;
        }
    );

    app.get(
        "/download_asset/:platform/*",
        { preHandler: app.authService.verifyAuthToken },
        async (request, reply) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const platform = (request.params as any).platform?.toLowerCase();
            if (platform !== "ios" && platform !== "android") {
                reply.status(400);
                return { status: "failed", code: "INVALID_PLATFORM" };
            }
            const assetPath = (request.params as any)["*"];
            if (!app.gameDataService.assetExists(platform, assetPath)) {
                reply.status(404);
                return "";
            }

            return reply.send(app.gameDataService.createAssetBinaryStreaming(platform, assetPath));
        }
    )

    app.get(
        "/catalog",
        { preHandler: app.authService.verifyAuthToken, config: { encrypted: true } },
        async (request, reply) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }
            
            const platform = (request.headers["x-platform"] as string)?.toLowerCase();
            if (platform !== "ios" && platform !== "android") {
                reply.status(400);
                return { status: "failed", code: "INVALID_PLATFORM" };
            }
            
            return {
                status: "OK",
                url: {
                    catalog: `https://api.paradigm.ariidesu.moe/server/hotassets/download_catalog/${platform}`,
                    checksum: `https://api.paradigm.ariidesu.moe/server/hotassets/download_catalog_checksum/${platform}`
                },
                version: app.gameDataService.getCatalogMetadata().version
            };
        }
    );

    app.post(
        "/sign",
        { preHandler: app.authService.verifyAuthToken, config: { encrypted: true } },
        async (request, reply) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const platform = (request.headers["x-platform"] as string)?.toLowerCase();
            if (platform !== "ios" && platform !== "android") {
                reply.status(400);
                return { status: "failed", code: "INVALID_PLATFORM" };
            }
            
            const { url_list } = request.body as { url_list: string[] };

            const data: {[key: string]: string} = {};
            url_list.forEach((url) => {
                data[url] = `https://api.paradigm.ariidesu.moe/server/hotassets/download_asset/${platform}${url}`;
            });
            return { status: "OK", data };
        }
    );
};

export default serverRoutes;