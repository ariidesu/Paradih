import { FastifyPluginAsync } from "fastify";

const serverRoutes: FastifyPluginAsync = async (app) => {
    // NOTE: These three doesn't exist in the actual server lol
    app.get(
        "/download_catalog/:platform",
        async (request, reply) => {
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
        async (request, reply) => {
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
        async (request, reply) => {
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

            return reply.send(app.gameDataService.createAssetBinaryStreaming(reply, platform, assetPath));
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

    app.get(
        "/translation",
        { preHandler: app.authService.verifyAuthToken, config: { encrypted: true } },
        async (request, reply) => {
            return {"status": "OK", "data": {"jp": {"achv_title_way__BSoarToINFwithCiel": "[Ciel] \u3092\u643a\u5e2f\u3057\u3066 soar to \u00d8 \u3092\u30d7\u30ec\u30a4\u3057\u3001Rank INF \u3092\u9054\u6210\u3059\u308b"}}}
        }
    )
};

export default serverRoutes;