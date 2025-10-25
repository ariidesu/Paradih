// Parse API's ranks data and output to ranks.json

const fs = require('fs');
const { request } = require('./utils/paradigm');

(async () => {
    const rankList = await request('/server/rank/list');
    const ids = rankList.data.map((rank) => rank.id);
    const rankQueryInfo = await request('/server/rank/query_info', { method: "POST", body: { rank_id_list: ids } });

    const rewardMapping = {
        "0": "dp",
        "1": "title",
        "2": "background",
    };

    const ranks = rankList.data.map(rank => {
        let playCostType = "dp";
        if (rank.play_cost_type == 1) {
            playCostType = "dp";
        }

        const cost = rankQueryInfo.data.find(item => item.id == rank.id)?.play_cost || 1000;

        return {
            id: rank.id,
            level: rank.level,
            type: rank.type,
            borders: rank.borders,
            starBorders: rank.star_borders,
            untilTime: rank.until_time,
            playCostType: playCostType,
            cost: cost,
            charts: rank.chart_list,
            rewards: rank.challenge_reward.map(reward => {
                return {
                    star: parseInt(reward.condition_params[1]),
                    reward: {
                        type: rewardMapping[reward.reward_params[0]],
                        value: reward.reward_params[0] == "0" ? parseInt(reward.reward_params[1]) : reward.reward_params[1],
                    },
                    id: reward.id,
                };
            }),
            gauge: {
                type: rank.gauge_type,
                values: {
                    decrypted: rank.decrypted,
                    received: rank.received,
                    lost: rank.lost,
                },
            },
            unlockTag: rank.unlock_tag || {},
        };
    });

    fs.writeFileSync('../data/ranks.json', JSON.stringify(ranks, null, 4), 'utf8');
})();