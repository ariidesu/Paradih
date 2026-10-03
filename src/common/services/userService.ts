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

            let selectedCode = 1;
            const usedCodes = await User.find({ username: "" })
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
                username: "",
                usernameCode: selectedCode,
                hasSetUsername: false,
                email,
                passwordHash,

                eco: {
                    ac: app.config.CONFIG_DEFAULT_AC,
                    dp: app.config.CONFIG_DEFAULT_DP,
                    navi: app.config.CONFIG_DEFAULT_NAVI,
                },
            });
        },

        async setInitialUsername(user: UserDoc, username: string) {
            let selectedCode = 1;
            const usedCodes = await User.find({ username })
                .select("usernameCode")
                .sort({ usernameCode: 1 });

            for (const existingUser of usedCodes) {
                if (existingUser.usernameCode == selectedCode) {
                    selectedCode++;
                } else if (existingUser.usernameCode > selectedCode) {
                    break;
                }
            }

            const result = await User.findByIdAndUpdate(
                user._id,
                {
                    $set: {
                        username,
                        usernameCode: selectedCode,
                        hasSetUsername: true,
                    },
                },
                { new: true },
            );
            if (result) {
                user.username = result.username;
                user.usernameCode = result.usernameCode;
                user.hasSetUsername = result.hasSetUsername;
            }
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
            isNew = true,
        ) {
            if (user.owned[itemType].some((item) => item.id === itemId)) {
                return;
            }

            const result = await User.findByIdAndUpdate(
                user._id,
                {
                    $push: {
                        [`owned.${itemType}`]: {
                            id: itemId,
                            acquiredAt: new Date(),
                            new: isNew,
                        },
                    },
                },
                { new: true },
            );

            if (result) {
                user.owned[itemType] = result.owned[itemType];
            }
        },

        async setHasReadOwnedItem(
            user: UserDoc,
            itemType: "titles" | "backgrounds" | "purchases",
            itemId: string,
        ) {
            const result = await User.updateOne(
                { _id: user._id, [`owned.${itemType}.id`]: itemId },
                {
                    $set: {
                        [`owned.${itemType}.$[item].new`]: false,
                    },
                },
                { arrayFilters: [{ "item.id": itemId }] },
            );

            if (result.modifiedCount > 0) {
                for (const item of user.owned[itemType]) {
                    if (item.id === itemId) {
                        item.new = false;
                    }
                }
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

        async setMailFavorite(user: UserDoc, mailId: string, favorite: boolean) {
            const update = favorite
                ? { $addToSet: { mailsFavorite: mailId } }
                : { $pull: { mailsFavorite: mailId } };
            const result = await User.findByIdAndUpdate(user._id, update, { new: true });
            if (result) {
                user.mailsFavorite = result.mailsFavorite;
            }
        },

        async deleteMail(user: UserDoc, mailId: string) {
            const result = await User.findByIdAndUpdate(
                user._id,
                { $addToSet: { mailsDeleted: mailId } },
                { new: true },
            );
            if (result) {
                user.mailsDeleted = result.mailsDeleted;
            }
        },

        async deleteAllMails(user: UserDoc, mailIds: string[]) {
            if (mailIds.length === 0) {
                return;
            }

            const result = await User.findByIdAndUpdate(
                user._id,
                { $addToSet: { mailsDeleted: { $each: mailIds } } },
                { new: true },
            );
            if (result) {
                user.mailsDeleted = result.mailsDeleted;
            }
        },

        async readAnnouncement(user: UserDoc, announcementId: string) {
            const result = await User.findByIdAndUpdate(
                user._id,
                { $addToSet: { announcementsRead: announcementId } },
                { new: true },
            );
            if (result) {
                user.announcementsRead = result.announcementsRead;
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

        async setRankSession(user: UserDoc, sessionId: string) {
            const result = await User.findByIdAndUpdate(
                user._id,
                {
                    $set: {
                        currentRankSession: sessionId,
                    },
                },
                { new: true },
            );
            if (result) {
                user.currentRankSession = result.currentRankSession;
            }
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
            const result = await User.updateOne(
                { _id: user._id, "ranksResult.id": rankId },
                {
                    $set: {
                        "ranksResult.$.totalScore": totalScore,
                        "ranksResult.$.clearState": clearState,
                        "ranksResult.$.fcAdState": fcAdState,
                        "ranksResult.$.passedStars": passedStars,
                        "ranksResult.$.maxViewChartCount": maxViewChartCount,
                        "ranksResult.$.claimedRewards": claimedRewards,
                    },
                },
            );

            if (result.modifiedCount == 0) {
                const result = await User.findByIdAndUpdate(user._id, {
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
                });
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
            } else {
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
