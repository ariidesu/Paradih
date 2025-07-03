import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import type { UserDoc } from "../models/User";

export function buildUserService(app: FastifyInstance) {
    const { User, Verify } = app.models;

    return {
        async hashPassword(password: string): Promise<string> {
            return await bcrypt.hash(password, 10);
        },

        async createUser(email: string, password: string): Promise<UserDoc> {
            const passwordHash = await this.hashPassword(password);

            // TODO: Better code choosing?
            let selectedCode = 1;
            const usedCodes = await User.find({ username: "Para" })
                .select("usernameCode")
                .sort({ usernameCode: 1 });

            for (const user of usedCodes) {
                if (user.usernameCode == selectedCode) {
                    selectedCode++;
                } else if (user.usernameCode > selectedCode) {
                    break;
                }
            }

            return await User.create({
                username: "Para",
                usernameCode: selectedCode,
                email,
                passwordHash,

                eco: {
                    ac: app.config.CONFIG_DEFAULT_AC,
                    dp: app.config.CONFIG_DEFAULT_DP,
                    navi: app.config.CONFIG_DEFAULT_NAVI,
                },
            });
        },

        async findByEmail(email: string): Promise<UserDoc | null> {
            return User.findOne({ email });
        },

        async findByNameAndCode(
            username: string,
            usernameCode: number,
        ): Promise<UserDoc | null> {
            return User.findOne({ username, usernameCode });
        },

        async findById(id: string): Promise<UserDoc | null> {
            return User.findById(id);
        },

        async deleteUser(id: string) {
            const user = await User.findById(id);
            if (!user) {
                return null;
            }

            await Verify.deleteMany({ userId: id });
            await User.deleteOne({ _id: id });
        },

        async addEconomy(
            user: UserDoc,
            ecoType: "ac" | "dp" | "navi",
            amount: number,
        ) {
            const result = await User.findByIdAndUpdate(
                user._id,
                { $inc: { [`eco.${ecoType}`]: amount } },
                { new: true },
            );
            if (result) {
                user.eco[ecoType] = result.eco[ecoType];
            }
        },

        async addOwnedItem(
            user: UserDoc,
            itemType: "titles" | "backgrounds" | "purchases",
            itemId: string,
        ) {
            const result = await User.findByIdAndUpdate(
                user._id,
                {
                    $push: {
                        [`owned.${itemType}`]: {
                            id: itemId,
                            acquiredAt: new Date(),
                        },
                    },
                },
                { new: true },
            );

            if (result) {
                user.owned[itemType] = result.owned[itemType];
            }
        },

        async changeStyle(
            user: UserDoc,
            type: "background" | "title",
            id: string,
        ) {
            const result = await User.findByIdAndUpdate(
                user._id,
                {
                    $set: {
                        [`style.${type}`]: id,
                    },
                },
                { new: true },
            );

            if (result) {
                user.style[type] = result.style[type];
            }
        },

        async changeUsername(
            user: UserDoc,
            username: string,
            usernameCode: number,
        ) {
            const result = await User.findByIdAndUpdate(
                user._id,
                {
                    $set: {
                        username,
                        usernameCode,
                    },
                },
                { new: true },
            );
            if (result) {
                user.username = result.username;
                user.usernameCode = result.usernameCode;
            }
        },

        async changePassword(user: UserDoc, password: string) {
            const hashedPassword = await this.hashPassword(password);
            const result = await User.findByIdAndUpdate(
                user._id,
                {
                    $set: {
                        passwordHash: hashedPassword,
                    },
                },
                { new: true },
            );
            if (result) {
                user.passwordHash = result.passwordHash;
            }
        },

        async setRankSession(user: UserDoc, rankId: string) {
            await User.findByIdAndUpdate(
                user._id,
                {
                    $set: {
                        currentRankSession: rankId,
                    },
                },
                { new: true },
            );
        },

        findRankResultById(user: UserDoc, rankId: string) {
            return user.ranksResult.find((result) => result.id == rankId);
        },

        async setRankResult(
            user: UserDoc,
            rankId: string,
            totalScore: number,
            clearState: number,
            fcAdState: number,
            passedStars: number,
            maxViewChartCount: number,
            claimedRewards: string[],
        ) {
            const result = await User.findByIdAndUpdate(
                user._id,
                {
                    $set: {
                        "ranksResult.$[elem].totalScore": totalScore,
                        "ranksResult.$[elem].clearState": clearState,
                        "ranksResult.$[elem].fcAdState": fcAdState,
                        "ranksResult.$[elem].passedStars": passedStars,
                        "ranksResult.$[elem].maxViewChartCount": maxViewChartCount,
                        "ranksResult.$[elem].claimedRewards": claimedRewards,
                    },
                },
                {
                    arrayFilters: [{ "elem.id": rankId }],
                    new: true,
                }
            );

            if (result) {
                const updatedResult = user.ranksResult.find(
                    (result) => result.id == rankId,
                );
                if (updatedResult) {
                    updatedResult.totalScore = totalScore;
                    updatedResult.clearState = clearState;
                    updatedResult.fcAdState = fcAdState;
                    updatedResult.passedStars = passedStars;
                    updatedResult.maxViewChartCount = maxViewChartCount;
                    updatedResult.claimedRewards = claimedRewards;
                }
            } else {
                const result = await User.findByIdAndUpdate(
                    user._id,
                    {
                        $push: {
                            ranksResult: {
                                id: rankId,
                                totalScore,
                                clearState,
                                fcAdState,
                                passedStars,
                                maxViewChartCount,
                                claimedRewards,
                            },
                        },
                    },
                    { new: true }
                );
                
                if (result) {
                    user.ranksResult.push({
                        id: rankId,
                        totalScore,
                        clearState,
                        fcAdState,
                        passedStars,
                        maxViewChartCount,
                        claimedRewards,
                    });
                }
            }
        },

        async updateMaxClearedCommonChallenge(user: UserDoc, maxCleared: number) {
            const result = await User.findByIdAndUpdate(
                user._id,
                {
                    $set: {
                        maxClearedCommonChallenge: maxCleared,
                    },
                },
                { new: true },
            );
            if (result) {
                user.maxClearedCommonChallenge = result.maxClearedCommonChallenge;
            }
        }
    };
}
