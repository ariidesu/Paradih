import { FastifyInstance } from "fastify";
import type { PlayResultDoc } from "../models/PlayResult";
import { UserDoc } from "../models/User";

export function buildPlayService(app: FastifyInstance) {
    const { User, PlayResult } = app.models;

    return {
        async getAllPlays(user: UserDoc): Promise<PlayResultDoc[] | null> {
            return await PlayResult.find({ userId: user._id });
        },

        async getChartPlayById(
            user: UserDoc,
            playId: string,
        ): Promise<PlayResultDoc | null> {
            return await PlayResult.findOne({ userId: user._id, _id: playId });
        },

        async getChartPlays(
            user: UserDoc,
            chartId: string,
        ): Promise<PlayResultDoc[] | null> {
            return await PlayResult.find({ userId: user._id, chartId });
        },

        async getBestPlays(user: UserDoc): Promise<PlayResultDoc[] | null> {
            return await PlayResult.aggregate<PlayResultDoc>([
                { $match: { userId: user._id } },
                { $sort: { score: -1 } },
                {
                    $group: {
                        _id: "$chartId",
                        doc: { $first: "$$ROOT" },
                    },
                },
                { $replaceRoot: { newRoot: "$doc" } },
            ]);
        },

        async getChartBestPlay(
            user: UserDoc,
            chartId: string,
        ): Promise<PlayResultDoc | null> {
            return await PlayResult.findOne({ userId: user._id, chartId }).sort(
                { score: -1 },
            );
        },

        async submitPlay(
            user: UserDoc,
            chartId: string,
            score: number,
            grade: number,
            combo: number,
            maxCombo: number,
            decrypted_plus: number,
            decrypted: number,
            received: number,
            lost: number,
        ): Promise<PlayResultDoc> {
            let rating = 0;

            // s/songname/difficulty
            const [prefix, songName, difficulty] = chartId.split("/");
            const songId = `${prefix}/${songName}`;
            const songData = app.gameDataService.getSongData(songId);
            if (songData && difficulty in songData.charts) {
                const constant =
                    songData.charts[difficulty as keyof typeof songData.charts];
                rating = this.calculatePlayRating(score, constant);
            }

            const result = await PlayResult.insertOne({
                userId: user._id,
                chartId,

                score,
                grade,
                combo,
                maxCombo,
                rating,
                stats: {
                    decrypted_plus,
                    decrypted,
                    received,
                    lost,
                },
            });

            // After we submit a play, we update the player's rating
            await this.updatePlayerRating(user);

            // Then we also add the play result to the user's rank play history
            await app.rankPlayService.addPlayResultToRankPlay(user, result);

            return result;
        },

        calculatePlayRating(score: number, chartConst: number): number {
            if (isNaN(chartConst) || chartConst == 0) return 0;

            const rewards = [
                [900000, 3],
                [930000, 1],
                [950000, 1],
                [970000, 1],
                [980000, 1],
                [990000, 1],
            ];

            let rating = 0;
            if (score >= 1009000) {
                rating =
                    chartConst * 10 +
                    7 +
                    Math.pow((score - 1009000) / 1000, 1.35) * 3;
            } else if (score >= 1000000) {
                rating = 10 * (chartConst + (2 * (score - 1000000)) / 30000);
            } else {
                for (const [scoreThreshold, reward] of rewards) {
                    if (score >= scoreThreshold) {
                        rating += reward;
                    }
                }
                rating +=
                    10 * (chartConst * Math.pow(score / 1000000, 1.5) - 0.9);
            }
            rating = Math.floor(Math.max(rating, 0) * 100 + 0.00002);

            return rating;
        },

        async updatePlayerRating(user: UserDoc) {
            const allBestPlays = await this.getBestPlays(user);
            if (!allBestPlays) {
                return;
            }

            const latestSeasonPlays: PlayResultDoc[] = [];
            const otherPlays: PlayResultDoc[] = [];

            for (const play of allBestPlays) {
                const [prefix, songName] = play.chartId.split("/");
                const songId = `${prefix}/${songName}`;

                const songData = app.gameDataService.getSongData(songId);
                // Our current season is 02, which starts from 3.0.0 onwards.
                // Hence we only need to check the "x" field of the version.
                if (songData && songData.version.x == 3) {
                    latestSeasonPlays.push(play);
                } else {
                    otherPlays.push(play);
                }
            }

            latestSeasonPlays.sort((a, b) => b.rating - a.rating);
            otherPlays.sort((a, b) => b.rating - a.rating);

            const topLatestSeasonPlays = latestSeasonPlays.slice(0, 15);
            const topOtherPlays = otherPlays.slice(0, 35);

            const selectedPlays = [...topLatestSeasonPlays, ...topOtherPlays];

            let totalRating = 0;
            for (const play of selectedPlays) {
                totalRating += play.rating;
            }
            const finalRating = Math.floor((totalRating / 50) * 100);

            const result = await User.findByIdAndUpdate(
                user._id,
                { rating: finalRating },
                { new: true },
            );
            if (result) {
                user.rating = result.rating;
            }
        },
    };
}
