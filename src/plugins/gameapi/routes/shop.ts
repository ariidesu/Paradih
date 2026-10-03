import { FastifyPluginAsync } from "fastify";

function productTypeToNumber(productType?: string) {
    switch (productType) {
        case "main":
            return 0;
        case "side":
            return 1;
        case "single":
            return 2;
        case "skin":
            return 3;
        default:
            return 0;
    }
}

function getPurchaseCost(item: {
    cost: number;
    discount: { enable: boolean; afterDiscount: number; discountTime: number };
}) {
    const discountActive =
        item.discount.enable &&
        item.discount.afterDiscount > 0 &&
        (item.discount.discountTime === 0 ||
            item.discount.discountTime > Math.floor(Date.now() / 1000));
    return discountActive
        ? item.discount.afterDiscount
        : item.cost;
}

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

            const body = request.body as { item_id?: unknown } | undefined;
            if (typeof body?.item_id !== "string") {
                return { status: "error", msg: "Missing info" };
            }
            const item_id = body.item_id;

            const purchaseItem = app.gameDataService.getPurchaseById(item_id);
            if (!purchaseItem) {
                return { status: "error", msg: "Item not found" };
            }
            if (request.user.owned.purchases.some((item) => item.id === item_id)) {
                return { status: "failed", reason: "ALREADY_OWNED" };
            }

            const cost = getPurchaseCost(purchaseItem);
            if (cost > request.user.eco[purchaseItem.moneyType]) {
                return { status: "failed" };
            }

            await app.userService.addEconomy(request.user, purchaseItem.moneyType, -cost);
            await app.userService.addOwnedItem(request.user, "purchases", item_id);

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
        "/buy_coin",
        {
            preHandler: app.authService.verifyAuthToken,
            config: { encrypted: true },
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const body = request.body as { gear?: unknown } | undefined;
            if (typeof body?.gear !== "number" || !Number.isFinite(body.gear)) {
                return { status: "error", msg: "Missing info" };
            }
            const gear = body.gear;
            const gearData = app.gameDataService.getGearData(gear);
            if (!gearData) {
                return { status: "error", msg: "Gear not found" };
            }
            if (gearData.cost > request.user.eco.ac) {
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

        const purchasesList: Record<string, PurchaseListEntry> = {};

        for (const [id, item] of Object.entries(
            app.gameDataService.getPurchases()
        )) {
            purchasesList[id] = {
                discount: {
                    after_discount: item.discount.afterDiscount,
                    before_discount: item.discount.beforeDiscount,
                    discount_time: item.discount.discountTime,
                    enable: item.discount.enable,
                    discount_in_web: false
                },
                limited_time: item.limitedTime,
                money_count: getPurchaseCost(item),
                money_type: item.moneyType,
                product_type: productTypeToNumber(item.productType),
                start_time: item.startTime,
            };
        }

        return purchasesList;
    });

};

export default serverRoutes;
