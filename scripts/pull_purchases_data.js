const fs = require("fs");
const { request } = require("./utils/paradigm");

(async () => {
    const response = await request("/server/user/init_client");
    const list = response.purchase_list;

    // let productType = 1;
    //         if (item.productType === "main") productType = 1;
    //         else if (item.productType === "side") productType = 2;
    //         else if (item.productType === "single") productType = 3;
    //         else if (item.productType === "skin") productType = 4;

    //         purchasesList[id] = {
    //             discount: {
    //                 after_discount: item.discount.afterDiscount,
    //                 before_discount: item.discount.beforeDiscount,
    //                 discount_time: item.discount.discountTime,
    //                 enable: item.discount.enable,
    //             },
    //             limited_time: item.limitedTime,
    //             money_count: item.cost,
    //             money_type: item.moneyType,
    //             product_type: productType,
    //             start_time: item.startTime,
    //         };
    const typeMapping = {
        1: "main",
        2: "side",
        3: "single",
        4: "skin"
    };

    const newList = {};
    Object.keys(list).forEach(itemKey => {
        const data = list[itemKey];

        const productType = typeMapping[data.product_type];
        newList[itemKey] = {
            cost: data.money_count,
            moneyType: data.money_type,
            productType: productType,
            discount: {
                afterDiscount: data.discount.after_discount,
                beforeDiscount: data.discount.before_discount,
                discountTime: data.discount.discount_time,
                enable: data.discount.enable
            },
            limitedTime: data.limited_time,
            startTime: data.start_time
        };
    });

    fs.writeFileSync(
        "../src/data/purchases.json",
        JSON.stringify(newList, null, 4)
    );

    process.exit(0);
})();