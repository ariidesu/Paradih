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
                return { status: "failed", code: "USER_NOT_FOUND" };
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

    app.get(
        "/get_info",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            return {
                status: "OK",
                username: request.user.username,
                username_id: request.user.usernameCode.toString(),

                rating: request.user.rating,
                eco: {
                    ac: request.user.eco!.ac,
                    dp: request.user.eco!.dp,
                    navi: request.user.eco!.navi,
                },
                style: {
                    title: request.user.style!.title,
                    background: request.user.style!.background,
                },

                has_unread_mail: false, // TODO: Implement this
                is_fool_sp: 0,
                max_clear_common_challenge: 0
            }
        }
    )
  
    app.post(
        "/add_coin",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
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