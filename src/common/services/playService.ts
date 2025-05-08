import { FastifyInstance } from "fastify";
import type { PlayResultDoc } from "../models/PlayResult";
import { UserDoc } from "../models/User";

export function buildPlayService(app: FastifyInstance) {
    const { PlayResult } = app.models;

    return {
        async getChartPlays(
            user: UserDoc,
            chartId: string
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
            chartId: string
        ): Promise<PlayResultDoc | null> {
            return await PlayResult.findOne({ userId: user._id, chartId }).sort(
                { score: -1 }
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
            lost: number
        ): Promise<PlayResultDoc> {
            return await PlayResult.insertOne({
                userId: user._id,
                chartId,

                score,
                grade,
                combo,
                maxCombo,
                stats: {
                    decrypted_plus,
                    decrypted,
                    received,
                    lost,
                },
            });
        },
    };
}
