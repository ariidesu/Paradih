// Parse API's ranks data and output to ranks.json

const fs = require('fs');

// .json file that contains raw data from "/rank/list" endpoint
const rawDataPath = process.argv[2];
// .json file that contains data from "/rank/query_info" endpoint
const queryInfoDataPath = process.argv[3];

const data = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));
const queryInfoData = JSON.parse(fs.readFileSync(queryInfoDataPath, 'utf8'));

const rewardMapping = {
    "0": "dp",
    "1": "title",
    "2": "background",
};

const ranks = data.data.map(rank => {
    let playCostType = "dp";
    if (rank.play_cost_type == 1) {
        playCostType = "dp";
    }

    const cost = queryInfoData.data.find(item => item.id == rank.id)?.play_cost || 1000;

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

fs.writeFileSync('../src/data/ranks.json', JSON.stringify(ranks, null, 4), 'utf8');