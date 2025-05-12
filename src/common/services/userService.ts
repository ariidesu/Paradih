import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import type { UserDoc } from "../models/User";

export function buildUserService(app: FastifyInstance) {
    const { User, Verify } = app.models;

    return {
        async createUser(email: string, password: string): Promise<UserDoc> {
            const passwordHash = await bcrypt.hash(password, 10);

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
            });
        },

        async findByEmail(email: string): Promise<UserDoc | null> {
            return User.findOne({ email });
        },

        async findByNameAndCode(
            username: string,
            usernameCode: number
        ): Promise<UserDoc | null> {
            return User.findOne({ username, usernameCode });
        },

        async addEconomy(
            user: UserDoc,
            ecoType: "ac" | "dp" | "navi",
            amount: number
        ) {
            user.eco[ecoType] += amount;
            await user.save();
        },
    };
}
