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
        "/init_client",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const purchasesList: any = {};

            for (const [id, item] of Object.entries(
                app.gameDataService.getPurchases()
            )) {
                let productType = 1;
                if (item.productType === "main") productType = 1;
                else if (item.productType === "side") productType = 2;
                else if (item.productType === "single") productType = 3;
                else if (item.productType === "skin") productType = 4;

                purchasesList[id] = {
                    discount: {
                        after_discount: item.discount.afterDiscount,
                        before_discount: item.discount.beforeDiscount,
                        discount_time: item.discount.discountTime,
                        enable: item.discount.enable,
                    },
                    limited_time: item.limitedTime,
                    money_count: item.cost,
                    money_type: item.moneyType,
                    product_type: productType,
                    start_time: item.startTime,
                };
            }

            const userSave = await app.userSaveService.getSave(request.user);

            return {
                status: "OK",

                user_info: {
                    username: request.user.username,
                    username_id: request.user.usernameCode.toString(),

                    rating: request.user.rating,
                    eco: {
                        ac: request.user.eco.ac,
                        dp: request.user.eco.dp,
                        navi: request.user.eco.navi,
                    },
                    style: {
                        title: request.user.style.title,
                        background: request.user.style.background,
                    },
                    own_item: request.user.owned.purchases.map(
                        (item) => item.id
                    ),

                    has_unread_mail: false, // TODO: Implement this
                    is_fool_sp: 0,
                    max_clear_common_challenge: 0,
                },

                save: {
                    save_time: userSave.updatedAt,
                    data: userSave.data,
                },

                best_result:
                    (await app.playService.getBestPlays(request.user))?.map(
                        (play) => {
                            return {
                                create_time: play.createdAt.getTime() / 1000,

                                chart_id: play.chartId,

                                score: play.score,
                                grade: play.grade,
                                rating: 0,

                                decrypted_plus_count: play.stats.decrypted_plus,
                                decrypted_count: play.stats.decrypted,
                                received_count: play.stats.received,
                                lost_count: play.stats.lost,
                            };
                        }
                    ) ?? [],
                style_list: {
                    title: request.user.owned.titles.map((item) => {
                        return {
                            get_time: item.acquiredAt.getTime() / 1000,
                            id: item.id,
                            is_new: false,
                        };
                    }),
                    background: request.user.owned.backgrounds.map((item) => {
                        return {
                            get_time: item.acquiredAt.getTime() / 1000,
                            id: item.id,
                            is_new: false,
                        };
                    }),
                },
                purchase_list: purchasesList,
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
                    ac: request.user.eco.ac,
                    dp: request.user.eco.dp,
                    navi: request.user.eco.navi,
                },
                style: {
                    title: request.user.style.title,
                    background: request.user.style.background,
                },
                own_item: request.user.owned.purchases.map(
                    (item) => item.id
                ),

                has_unread_mail: false, // TODO: Implement this
                is_fool_sp: 0,
                max_clear_common_challenge: 0,
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
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const { coin_list } = request.body as {
                coin_list: {
                    type: "ac" | "dp" | "navi";
                    count: number;
                }[];
            };
            for (const c of coin_list) {
                await app.userService.addEconomy(request.user, c.type, c.count);
            }

            return {
                status: "OK",
                eco: {
                    ac: request.user.eco.ac,
                    dp: request.user.eco.dp,
                    navi: request.user.eco.navi,
                },
            };
        }
    );

    app.post(
        "/unlock_style",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const { style_type, style_id } = request.body as {
                style_type: "title" | "background";
                style_id: string;
            };

            const actualStyleType = style_type == "title" ? "titles" : "backgrounds";

            await app.userService.addOwnedItem(
                request.user,
                actualStyleType,
                style_id
            );

            return { status: "OK" };
        }
    );

    app.get(
        "/get_mail",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const mails = await app.mailService.getMails();
            const mailsResponse = [];
            for (const mail of mails) {
                const hasRead = await app.mailService.hasReadMail(
                    request.user,
                    mail.id
                );

                mailsResponse.push({
                    mail_id: mail.id,
                    send_time: mail.createdAt.getTime() / 1000,
                    expire_time: mail.expireAt.getTime() / 1000,

                    sender: mail.sender,
                    title: mail.title,
                    content: mail.content,
                    item: mail.items, // NOTE: Schema might change and this might be incorrect. Let's leave it like that for now

                    link: mail.link.map((l) => {
                        return {
                            text: l.text,
                            addr: l.addr,
                        };
                    }),

                    is_get_item: !hasRead,
                    is_read: hasRead,
                });
            }

            return { status: "OK", mail: mailsResponse };
        }
    );

    app.post(
        "/read_mail",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const { mail_id } = request.body as { mail_id: string };
            const remainingMails = await app.mailService.readMail(
                request.user,
                mail_id
            );
            const mailsResponse = [];
            for (const mail of remainingMails) {
                const hasRead = await app.mailService.hasReadMail(
                    request.user,
                    mail.id
                );

                mailsResponse.push({
                    mail_id: mail.id,
                    send_time: mail.createdAt.getTime() / 1000,
                    expire_time: mail.expireAt.getTime() / 1000,

                    sender: mail.sender,
                    title: mail.title,
                    content: mail.content,
                    item: mail.items, // NOTE: Schema might change and this might be incorrect. Let's leave it like that for now

                    link: mail.link.map((l) => {
                        return {
                            text: l.text,
                            addr: l.addr,
                        };
                    }),

                    is_get_item: !hasRead,
                    is_read: hasRead,
                });
            }

            return { status: "OK", mail: mailsResponse };
        }
    );

    app.post(
        "/update_save",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const { update_data, eco_operation } = request.body as {
                update_data: { [key: string]: any };
                eco_operation: { dp: number; navi: number };
            };
            await app.userSaveService.setSaves(request.user, update_data);
            if (eco_operation.dp != 0)
                await app.userService.addEconomy(
                    request.user,
                    "dp",
                    eco_operation.dp
                );
            if (eco_operation.navi != 0)
                await app.userService.addEconomy(
                    request.user,
                    "navi",
                    eco_operation.navi
                );

            return {
                status: "OK",
                eco: {
                    ac: request.user.eco.ac,
                    dp: request.user.eco.dp,
                    navi: request.user.eco.navi,
                },
            };
        }
    );
};

export default authenticatedUserRoutes;
