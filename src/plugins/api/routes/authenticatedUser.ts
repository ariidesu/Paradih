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
                    own_item: [],

                    has_unread_mail: false, // TODO: Implement this
                    is_fool_sp: 0,
                    max_clear_common_challenge: 0
                },
                
                save: {
                    save_time: userSave.updatedAt,
                    data: userSave.data
                },

                best_result: [],
                style_list: {
                    title: [
                        {"id": "NWelcomeBack", "get_time": 1702008000, "is_new": false}, {"id": "NNewJourney", "get_time": 1702008000, "is_new": false}, {"id": "GAnniversary1", "get_time": 1702339017, "is_new": false}, {"id": "GInfinitePassionSkin", "get_time": 1702356335, "is_new": false}, {"id": "NUnforgettableMemories", "get_time": 1702356335, "is_new": false}, {"id": "NNWAD", "get_time": 1702356335, "is_new": false}, {"id": "SVirtualSouls", "get_time": 1702356336, "is_new": false}, {"id": "NPremium", "get_time": 1702356336, "is_new": false}, {"id": "NPlaytime0", "get_time": 1707451200, "is_new": false}, {"id": "GAnniversary2", "get_time": 1734581950, "is_new": false}, {"id": "GRTCampaign202412", "get_time": 1734581950, "is_new": false}
                    ],
                    background: [
                        {
                            "get_time": 1725720752,
                            "id": "BGDefault",
                            "is_new": false
                        },
                        {
                            "get_time": 1733889270,
                            "id": "BGStory02",
                            "is_new": false
                        },
                        {
                            "get_time": 1733891519,
                            "id": "BGStory14",
                            "is_new": false
                        },
                        {
                            "get_time": 1733891704,
                            "id": "BGStory17",
                            "is_new": false
                        },
                        {
                            "get_time": 1733891837,
                            "id": "BGStory26",
                            "is_new": false
                        },
                        {
                            "get_time": 1733892013,
                            "id": "BGStory33",
                            "is_new": false
                        },
                        {
                            "get_time": 1733892013,
                            "id": "BGStory37",
                            "is_new": false
                        },
                        {
                            "get_time": 1733892161,
                            "id": "BGStory43B",
                            "is_new": false
                        },
                        {
                            "get_time": 1733892373,
                            "id": "BGStory47",
                            "is_new": false
                        }
                    ]
                },
                purchase_list: {
                    "main02": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 100,
                        "money_type": "ac",
                        "product_type": 1,
                        "start_time": 0
                    },
                    "main03": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 100,
                        "money_type": "ac",
                        "product_type": 1,
                        "start_time": 0
                    },
                    "main04": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 120,
                        "money_type": "ac",
                        "product_type": 1,
                        "start_time": 0
                    },
                    "side01": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side02": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side03": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side04": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side05": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side06": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 100,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side07": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side08": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 40,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side09": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side10": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side11": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side12": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side13": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side14": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side15": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side16": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side17": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side18": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side19": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side20": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side21": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side22": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side23": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 100,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side24": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 100,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side25": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 100,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side26": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 100,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side27": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side28": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side29": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side30": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "side31": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 2,
                        "start_time": 0
                    },
                    "single01": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single02": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single03": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single04": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single05": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single06": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single07": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single08": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single09": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single10": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single11": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single12": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single13": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single14": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single15": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single16": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single17": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single18": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single19": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single20": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single21": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single22": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single23": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single24": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single25": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single26": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single27": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "single28": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 20,
                        "money_type": "ac",
                        "product_type": 3,
                        "start_time": 0
                    },
                    "skin02": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 100,
                        "money_type": "ac",
                        "product_type": 4,
                        "start_time": 0
                    },
                    "skin03": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 100,
                        "money_type": "ac",
                        "product_type": 4,
                        "start_time": 0
                    },
                    "skin04": {
                        "discount": {
                            "after_discount": 60,
                            "before_discount": 80,
                            "discount_time": 1706644800,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 4,
                        "start_time": 0
                    },
                    "skin05": {
                        "discount": {
                            "after_discount": 60,
                            "before_discount": 80,
                            "discount_time": 1706644800,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 4,
                        "start_time": 0
                    },
                    "skin06": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 4,
                        "start_time": 0
                    },
                    "skin08": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 4,
                        "start_time": 0
                    },
                    "skin09": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 4,
                        "start_time": 0
                    },
                    "skin10": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 4,
                        "start_time": 0
                    },
                    "skin11": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 80,
                        "money_type": "ac",
                        "product_type": 4,
                        "start_time": 0
                    },
                    "skin12": {
                        "discount": {
                            "after_discount": 0,
                            "before_discount": 0,
                            "discount_time": 0,
                            "enable": false
                        },
                        "limited_time": 0,
                        "money_count": 100,
                        "money_type": "ac",
                        "product_type": 4,
                        "start_time": 0
                    }
                }
            }
        }
    )

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
                own_item: [],

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
                ac: request.user.eco.ac,
                dp: request.user.eco.dp,
                navi: request.user.eco.navi
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
                    send_time: mail.createdAt.getTime() / 1000,
                    expire_time: mail.expireAt.getTime() / 1000,

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
                    send_time: mail.createdAt.getTime() / 1000,
                    expire_time: mail.expireAt.getTime() / 1000,

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
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const { update_data, eco_operation } = request.body as { update_data: {[key: string]: any}, eco_operation: { dp: number, navi: number } };
            await app.userSaveService.setSaves(request.user, update_data);
            if (eco_operation.dp != 0)
                await app.userService.addEconomy(request.user, "dp", eco_operation.dp);
            if (eco_operation.navi != 0)
                await app.userService.addEconomy(request.user, "navi", eco_operation.navi);

            return {
                status: "OK",
                eco: {
                    ac: request.user.eco.ac,
                    dp: request.user.eco.dp,
                    navi: request.user.eco.navi,
                }
            }
        }
    )
};

export default authenticatedUserRoutes;