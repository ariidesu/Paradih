import { FastifyInstance } from "fastify";
import type { RankPlayDoc } from "../models/RankPlay";
import { UserDoc } from "../models/User";
import { PlayResultDoc } from "../models/PlayResult";

export function buildRankPlayService(app: FastifyInstance) {
    const { RankPlay } = app.models;

    return {
        async getCurrentRankPlaySession(
            user: UserDoc,
        ): Promise<RankPlayDoc | null> {
            if (user.currentRankSession == "") {
                return null;
            }

            return RankPlay.findById(user.currentRankSession);
        },

        async createRankPlay(
            user: UserDoc,
            rankId: string,
        ): Promise<RankPlayDoc> {
            return RankPlay.create({
                userId: user._id,
                rankId,
                score: 0,
            });
        },

        async addPlayResultToRankPlay(
            user: UserDoc,
            playResult: PlayResultDoc,
        ) {
            if (user.currentRankSession == "") {
                return;
            }

            await RankPlay.findByIdAndUpdate(user.currentRankSession, {
                $inc: { score: playResult.score },
                $addToSet: { resultIds: playResult._id },
            });
        },
    };
}
