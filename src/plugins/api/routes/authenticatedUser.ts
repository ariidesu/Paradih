import { FastifyPluginAsync } from "fastify";

const authenticatedUserRoutes: FastifyPluginAsync = async (app) => {
    app.get(
        "/login",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "fail" };
            }

            return {
                status: "OK",

                api_min_ver: 63,
                first_login: false,
                last_device_id: "",
                latest_ver: 63,

                battle_token: "",
                web_token: "",
            };
        }
    );

  
    app.post(
        "/add_coin",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "fail" };
            }

            const { coin_list } = request.body as {
                coin_list: {
                    type: "ac" | "dp" | "navi",
                    count: number
                }[]
            };
            for (const c of coin_list) {
                await app.userService.addEconomy(request.user, c.type, c.count);
            }
            
            return { status: "OK", eco: {
                ac: request.user.eco!.ac,
                dp: request.user.eco!.dp,
                navi: request.user.eco!.navi
            } };
        }
    )

    app.post(
        "/unlock_style",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true }
        },
        async (request) => {
            throw new Error("not implemented yippi")
        }
    )

    app.get(
        "/get_mail",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true }
        },
        async (request) => {
            throw new Error("not implemented yippi")
        }
    )

    app.post(
        "/read_mail",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true }
        },
        async (request) => {
            throw new Error("not implemented yippi")
        }
    )

    app.post(
        "/update_save",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true }
        },
        async (request) => {
            throw new Error("not implemented yippi")
        }
    )
};

export default authenticatedUserRoutes;