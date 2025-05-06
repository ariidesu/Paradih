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
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const mails = await app.mailService.getMails();
            const mailsResponse = [];
            for (const mail of mails) {
                const hasRead = await app.mailService.hasReadMail(request.user, mail.id);

                mailsResponse.push({
                    mail_id: mail.id,
                    send_time: mail.createdAt.getMilliseconds(),
                    expire_time: mail.expireAt?.getMilliseconds(),

                    sender: mail.sender,
                    title: mail.title,
                    content: mail.content,
                    item: mail.items, // NOTE: Schema might change and this might be incorrect. Let's leave it like that for now
                    
                    link: mail.link.map((l) => {
                        return { 
                            text: l.text,
                            addr: l.addr
                        }
                    }),

                    is_get_item: !hasRead,
                    is_read: hasRead,
                })
            }

            return { status: "OK", mail: mailsResponse };
        }
    )

    app.post(
        "/read_mail",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true }
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const { mail_id } = request.body as { mail_id: string };
            const remainingMails = await app.mailService.readMail(request.user, mail_id);
            const mailsResponse = [];
            for (const mail of remainingMails) {
                const hasRead = await app.mailService.hasReadMail(request.user, mail.id);

                mailsResponse.push({
                    mail_id: mail.id,
                    send_time: mail.createdAt.getMilliseconds(),
                    expire_time: mail.expireAt?.getMilliseconds(),

                    sender: mail.sender,
                    title: mail.title,
                    content: mail.content,
                    item: mail.items, // NOTE: Schema might change and this might be incorrect. Let's leave it like that for now
                    
                    link: mail.link.map((l) => {
                        return { 
                            text: l.text,
                            addr: l.addr
                        }
                    }),

                    is_get_item: !hasRead,
                    is_read: hasRead,
                })
            }

            return { status: "OK", mail: mailsResponse };
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