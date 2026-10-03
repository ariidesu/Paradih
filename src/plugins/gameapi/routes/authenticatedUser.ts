import { FastifyPluginAsync } from "fastify";

interface PurchaseListEntry {
    discount: {
        after_discount: number;
        before_discount: number;
        discount_time: number;
        enable: boolean;
        discount_in_web: boolean;
    };
    limited_time: number;
    money_count: number;
    money_type: string;
    product_type: number;
    start_time: number;
}

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

            const battleToken = await app.authService.issueBattleToken(request.user._id as string, request.user.email)
            return {
                status: "OK",

                api_min_ver: 97,
                first_login: !request.user.hasSetUsername,
                last_device_id: (request.headers["x-device-id"] as string) || "",
                latest_ver: 97,

                battle_token: battleToken,
                web_token: "",
                timestamp: Math.floor(Date.now() / 1000),
            };
        }
    );

    app.post(
        "/set_name",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const { name } = request.body as { name?: string };
            if (typeof name !== "string") {
                return { status: "failed", reason: 1 };
            }

            const username = name.trim();
            if (username.length === 0) {
                return { status: "failed", reason: 1 };
            }
            if (request.user.hasSetUsername) {
                return { status: "failed", reason: 4 };
            }

            await app.userService.setInitialUsername(request.user, username);
            return {
                status: "OK",
                username: request.user.username,
                username_id: request.user.usernameCode.toString(),
            };
        },
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

            // This is done to ensure that the rating is always up-to-date
            await app.playService.updatePlayerRating(request.user);

            // Check if existing user don't own the item (bug)
            const defaultBackground = request.user.owned.backgrounds.find((b) => b.id == "BGDefault");
            if (!defaultBackground) {
                await app.userService.addOwnedItem(request.user, "backgrounds", "BGDefault", false);
            } else if (defaultBackground.new) {
                await app.userService.setHasReadOwnedItem(request.user, "backgrounds", "BGDefault");
            }

            const purchasesList: Record<string, PurchaseListEntry> = {};

            for (const [id, item] of Object.entries(
                app.gameDataService.getPurchases()
            )) {
                let productType = 0;
                if (item.productType === "main") productType = 0;
                else if (item.productType === "side") productType = 1;
                else if (item.productType === "single") productType = 2;
                else if (item.productType === "skin") productType = 3;

                purchasesList[id] = {
                    discount: {
                        after_discount: item.discount.afterDiscount,
                        before_discount: item.discount.beforeDiscount,
                        discount_time: item.discount.discountTime,
                        enable: item.discount.enable,
                        discount_in_web: false
                    },
                    limited_time: item.limitedTime,
                    money_count: item.cost,
                    money_type: item.moneyType,
                    product_type: productType,
                    start_time: item.startTime,
                };
            }

            const userSave = await app.userSaveService.getSave(request.user);
            // We implemented mail later on, so check if user has stormy rage flag
            const stormyRageFlag = userSave.data.get("/sp/storm_rage_mail");
            if (stormyRageFlag == 1) {
                await app.mailService.gameplaySendStormyRageMail(request.user);
            }

            // Force unlock GIGANTOMACHINA RBT chart
            const gigantomachinaTrackUnlockFlag = userSave.data.get("/trackunlock/s/gigantomachina");
            if (gigantomachinaTrackUnlockFlag != 1039) {
                await app.userSaveService.setSave(request.user, "/trackunlock/s/gigantomachina", 1039);
                userSave.data.set("/trackunlock/s/gigantomachina", 1039);
            }

            const now = Math.floor(Date.now() / 1000);
            let paradigmOnlineActive = false;
            let paradigmOnlineExpireTime = 0;

            if (app.config.PARADIGM_ONLINE_ENABLED) {
                if (app.config.PARADIGM_ONLINE_FORCE_ACTIVE) {
                    paradigmOnlineActive = true;
                    paradigmOnlineExpireTime = request.user.prdOnlineTime || 4102444800;
                } else {
                    const isActive = request.user.prdOnline && request.user.prdOnlineTime > now;
                    paradigmOnlineActive = isActive;
                    paradigmOnlineExpireTime = isActive ? request.user.prdOnlineTime : 0;
                }
            }

            const bestPlays = await app.playService.getBestPlays(request.user);
            const chartIds = bestPlays?.map(p => p.chartId) || [];
            const statsMap = await app.playService.getChartPlayStatsForCharts(request.user, chartIds);

            const { season: latestSeasonPlays, nonSeason: otherPlays } = await app.playService.getBestPlaysBySeason(request.user);
            latestSeasonPlays.sort((a, b) => b.rating - a.rating);
            otherPlays.sort((a, b) => b.rating - a.rating);

            latestSeasonPlays.sort((a, b) => b.rating - a.rating);
            otherPlays.sort((a, b) => b.rating - a.rating);

            const topLatestSeasonPlays = latestSeasonPlays.filter((play) => play.chartId.split("/")[2] != "chaotic").slice(0, 15).map((play, i) => {
                const [prefix, songName, difficulty] = play.chartId.split("/");
                const parsedDifficulty = app.gameDataService.difficultyStringToNumber(difficulty);
                const songId = `${prefix}/${songName}`;
                return { index: i + 1, id: songId, difficulty: parsedDifficulty, score: play.score, rating: play.rating, grade: play.grade };
            });
            const topOtherPlays = otherPlays.filter((play) => play.chartId.split("/")[2] != "chaotic").slice(0, 35).map((play, i) => {
                const [prefix, songName, difficulty] = play.chartId.split("/");
                const parsedDifficulty = app.gameDataService.difficultyStringToNumber(difficulty);
                const songId = `${prefix}/${songName}`;
                return { index: i + 1, id: songId, difficulty: parsedDifficulty, score: play.score, rating: play.rating, grade: play.grade };
            });

            let highestRating = 0;
            for (const song of app.gameDataService.getSongs()) {
                for (const chartConst of Object.values(song.charts)) {
                    highestRating = Math.max(highestRating, Math.floor((chartConst + 1) * 1000 + 0.00002));
                }
            }

            return {
                status: "OK",

                user_info: {
                    timestamp: Math.floor(Date.now() / 1000),

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

                    has_unread_mail: (await app.mailService.getUnreadMails(request.user)).length > 0,
                    is_fool_sp: 0,
                    max_clear_common_challenge: request.user.maxClearedCommonChallenge,
                    max_unread_anno_level: Math.max(
                        0,
                        ...app.announcementService
                            .getAnnouncements(request.user)
                            .filter((anno) => !anno.is_read)
                            .map((anno) => anno.anno_level),
                    ),
                    shika: false,

                    prd_online: paradigmOnlineActive,
                    prd_online_time: paradigmOnlineExpireTime,
                    prd_bind_account: true
                },

                save: {
                    save_time: Math.floor(userSave.updatedAt.getTime() / 1000),
                    data: userSave.data,
                },

                best_result:
                    bestPlays ? await Promise.all(bestPlays.map(
                        async (play) => {
                            const stats = statsMap[play.chartId] ?? { playTimes: 0, totalDecrypted: 0, totalReceived: 0, totalLost: 0, maxRating: 0 };
                            let maxRating = -1;
                            if (paradigmOnlineActive) {
                                const [prefix, songName, difficulty] = play.chartId.split("/");
                                const songData = app.gameDataService.getSongData(`${prefix}/${songName}`);
                                if (songData && difficulty in songData.charts) {
                                    const chartConst = songData.charts[difficulty as keyof typeof songData.charts];
                                    maxRating = Math.floor((chartConst + 1) * 1000 + 0.00002);
                                }
                            }

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
                                }
                            };
                        }
                    )) : [],
                style_list: {
                    title: request.user.owned.titles.map((item) => {
                        return {
                            get_time: item.acquiredAt.getTime() / 1000,
                            id: item.id,
                            is_new: item.new,
                        };
                    }),
                    background: request.user.owned.backgrounds.map((item) => {
                        return {
                            get_time: item.acquiredAt.getTime() / 1000,
                            id: item.id,
                            is_new: item.new,
                        };
                    }),
                },
                purchase_list: purchasesList,

                po_b50: {
                    past: paradigmOnlineActive ? topOtherPlays : [],
                    now: paradigmOnlineActive ? topLatestSeasonPlays : [],
                    highest_rating: highestRating
                }
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

            // Whenever we fetch user's info (happens everytime we reach menu)
            // That means we are not in a rank play session
            // We reset it.
            if (request.user.currentRankSession != "") {
                await app.userService.setRankSession(request.user, "");
            }

            const now = Math.floor(Date.now() / 1000);
            let paradigmOnlineActive = false;
            let paradigmOnlineExpireTime = 0;

            if (app.config.PARADIGM_ONLINE_ENABLED) {
                if (app.config.PARADIGM_ONLINE_FORCE_ACTIVE) {
                    paradigmOnlineActive = true;
                    paradigmOnlineExpireTime = request.user.prdOnlineTime || 4102444800;
                } else {
                    const isActive = request.user.prdOnline && request.user.prdOnlineTime > now;
                    paradigmOnlineActive = isActive;
                    paradigmOnlineExpireTime = isActive ? request.user.prdOnlineTime : 0;
                }
            }

            return {
                status: "OK",
                
                timestamp: Math.floor(Date.now() / 1000),

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

                has_unread_mail: (await app.mailService.getUnreadMails(request.user)).length > 0,
                is_fool_sp: 0,
                max_clear_common_challenge: request.user.maxClearedCommonChallenge,
                max_unread_anno_level: Math.max(
                    0,
                    ...app.announcementService
                        .getAnnouncements(request.user)
                        .filter((anno) => !anno.is_read)
                        .map((anno) => anno.anno_level),
                ),
                shika: false,

                prd_online: paradigmOnlineActive,
                prd_online_time: paradigmOnlineExpireTime,
                prd_bind_account: true
            };
        }
    );

    app.get(
        "/get_anno_list",
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
                data: app.announcementService.getAnnouncements(request.user),
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
                coin_list?: {
                    type: "ac" | "dp" | "navi";
                    count: number;
                }[];
            };
            if (
                !Array.isArray(coin_list) ||
                coin_list.some(
                    (coin) =>
                        !coin ||
                        !["ac", "dp", "navi"].includes(coin.type) ||
                        typeof coin.count !== "number",
                )
            ) {
                return { status: "error", msg: "Missing info" };
            }
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
        "/gift_code",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const { code } = request.body as { code?: string };
            if (typeof code !== "string" || code.length === 0) {
                return { status: "error", msg: "Missing info" };
            }

            return { status: "failed", reason: 1 };
        },
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

            const body = request.body as {
                style_type?: unknown;
                style_id?: unknown;
            } | undefined;
            if (typeof body?.style_id !== "string") {
                return { status: "error", msg: "Missing info" };
            }

            const actualStyleType = body.style_type === "title" ? "titles" : "backgrounds";

            await app.userService.addOwnedItem(
                request.user,
                actualStyleType,
                body.style_id
            );

            return { status: "OK" };
        }
    );

    app.post(
        "/update_style",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const body = request.body as {
                update_list?: unknown;
            } | undefined;
            if (!Array.isArray(body?.update_list)) {
                return { status: "error", msg: "Missing info" };
            }
            if (
                !body.update_list.every(
                    (item): item is {
                        style_type: "title" | "background";
                        style_id: string;
                    } =>
                        !!item &&
                        typeof item === "object" &&
                        ((item as { style_type?: unknown }).style_type === "title" ||
                            (item as { style_type?: unknown }).style_type === "background") &&
                        typeof (item as { style_id?: unknown }).style_id === "string",
                )
            ) {
                return { status: "error", msg: "Bad argument" };
            }

            for (const item of body.update_list) {
                await app.userService.changeStyle(
                    request.user,
                    item.style_type,
                    item.style_id
                );
            }

            return {
                status: "OK",
                style: {
                    now_title: request.user.style.title,
                    now_background: request.user.style.background,
                    now_skin: "para/default",
                },
            };
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

            const mails = await app.mailService.getMails(request.user);
            const mailsResponse = [];
            for (const mail of mails) {
                const hasRead = await app.mailService.hasReadMail(
                    request.user,
                    mail.id
                );
                const hasClaimed = await app.mailService.hasClaimedMail(
                    request.user,
                    mail.id
                );

                mailsResponse.push({
                    mail_id: mail.id,
                    send_time: mail.createdAt.getTime() / 1000,
                    expire_time: mail.expireAt.getTime() / 1000,

                    sender_name: mail.sender,
                    title: mail.title,
                    content: mail.content,
                    item: mail.items, // NOTE: Schema might change and this might be incorrect. Let's leave it like that for now

                    link: mail.link.map((l) => {
                        return {
                            text: l.text,
                            addr: l.addr,
                        };
                    }),

                    is_get_item: hasClaimed,
                    is_read: hasRead,
                    is_favorite: request.user.mailsFavorite.includes(mail.id),
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
                const hasClaimed = await app.mailService.hasClaimedMail(
                    request.user,
                    mail.id
                );

                mailsResponse.push({
                    mail_id: mail.id,
                    send_time: mail.createdAt.getTime() / 1000,
                    expire_time: mail.expireAt.getTime() / 1000,

                    sender_name: mail.sender,
                    title: mail.title,
                    content: mail.content,
                    item: mail.items, // NOTE: Schema might change and this might be incorrect. Let's leave it like that for now

                    link: mail.link.map((l) => {
                        return {
                            text: l.text,
                            addr: l.addr,
                        };
                    }),

                    is_get_item: hasClaimed,
                    is_read: hasRead,
                    is_favorite: request.user.mailsFavorite.includes(mail.id),
                });
            }

            return { status: "OK", mail: mailsResponse };
        }
    );

    app.post(
        "/get_mail_item",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const { mail_id } = request.body as { mail_id: string };

            if (!(await app.mailService.getMailItems(request.user, mail_id))) {
                return { status: "failed" };
            }
            await app.mailService.claimMail(request.user, mail_id);

            return { status: "OK" };
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
                update_data?: Record<string, unknown>;
                eco_operation?: { dp?: number; navi?: number };
            };
            if (
                !update_data ||
                typeof update_data !== "object" ||
                Array.isArray(update_data)
            ) {
                return { status: "error", msg: "Missing info" };
            }

            await app.userSaveService.setSaves(request.user, update_data);
            if (eco_operation?.dp)
                await app.userService.addEconomy(
                    request.user,
                    "dp",
                    eco_operation.dp
                );
            if (eco_operation?.navi)
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

    app.get(
        "/sync_save",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const save = await app.userSaveService.getSave(request.user);
            return {
                status: "OK",
                save_time: save.updatedAt.getTime() / 1000,
                data: Object.fromEntries(save.data.entries()),
            };
        },
    );

    app.post(
        "/read_anno",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const { anno_id } = request.body as { anno_id?: string };
            if (typeof anno_id !== "string" || anno_id.length === 0) {
                return { status: "error", msg: "Missing info" };
            }

            await app.userService.readAnnouncement(request.user, anno_id);
            return { status: "OK" };
        },
    );
    
    app.get(
        "/get_style_list",
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
                data: {
                    title: request.user.owned.titles.map((item) => {
                        return {
                            get_time: item.acquiredAt.getTime() / 1000,
                            id: item.id,
                            is_new: item.new,
                        };
                    }),
                    background: request.user.owned.backgrounds.map((item) => {
                        return {
                            get_time: item.acquiredAt.getTime() / 1000,
                            id: item.id,
                            is_new: item.new,
                        };
                    }),
                }
            };
        }
    );

    app.post(
        "/read_style",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const body = request.body as {
                style_list?: unknown;
            } | undefined;
            if (
                !Array.isArray(body?.style_list) ||
                !body.style_list.every(
                    (item): item is {
                        style_type: "title" | "background";
                        style_id: string;
                    } =>
                        !!item &&
                        typeof item === "object" &&
                        ((item as { style_type?: unknown }).style_type === "title" ||
                            (item as { style_type?: unknown }).style_type === "background") &&
                        typeof (item as { style_id?: unknown }).style_id === "string",
                )
            ) {
                return { status: "error", msg: "Missing info" };
            }

            for (const item of body.style_list) {
                const actualStyleType = item.style_type == "title" ? "titles" : "backgrounds";
                await app.userService.setHasReadOwnedItem(request.user, actualStyleType, item.style_id);
            }

            return { status: "OK" };
        }
    )
};

export default authenticatedUserRoutes;
