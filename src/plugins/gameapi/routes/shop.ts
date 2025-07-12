import { FastifyPluginAsync } from "fastify";

const serverRoutes: FastifyPluginAsync = async (app) => {
    app.post(
        "/purchase",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const { item_id } = request.body as {
                item_id: string;
            };

            const purchaseItem = app.gameDataService.getPurchaseById(item_id);
            if (!purchaseItem || purchaseItem.cost > request.user.eco[purchaseItem.moneyType]) {
                return { status: "failed" };
            }

            await app.userService.addEconomy(request.user, purchaseItem.moneyType, -purchaseItem.cost);
            await app.userService.addOwnedItem(request.user, "purchases", item_id);

            return { status: "OK", ac: request.user.eco.ac };
        }
    );

    app.post(
        "/buy_coin",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const { gear } = request.body as {
                gear: number;
            };
            const gearData = app.gameDataService.getGearData(gear);
            if (!gearData || gearData.cost > request.user.eco.ac) {
                return { status: "failed" };
            }

            await app.userService.addEconomy(request.user, "ac", -gearData.cost);
            await app.userService.addEconomy(request.user, "dp", gearData.dp);

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

    app.get("/get_list", {
        preHandler: app.authService.verifyAuthToken,
        config: { encrypted: true },
    }, async (request) => {
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

        return purchasesList;
    })
};

export default serverRoutes;