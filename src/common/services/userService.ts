import { FastifyInstance } from "fastify";
import { randomBytes, randomUUID } from "crypto";
import bcrypt from "bcrypt";
import type { UserDoc } from "../models/User";
import { VerifyDoc } from "../models/Verify";

export function buildUserService(app: FastifyInstance) {
    const { User, Verify } = app.models;

    return {
        async createVerifyCode(email: string): Promise<string> {
            if (await this.getVerifyCode(email) != null) {
                throw new Error(`Email ${email} already has a verify code.`);
            }

            const code = randomUUID();
            await Verify.create({ code, email });
            return code;
        },

        async getVerifyCode(email: string): Promise<string | null> {
            const doc = await Verify.findOne({ email });
            return doc && doc.code;
        },

        async checkVerifyCode(email: string, verifyCode: string): Promise<boolean> {
            // TODO: verifyCode expiration
            const currentVerifyCode = await this.getVerifyCode(email);
            if (!currentVerifyCode) {
                return false;
            }

            if (verifyCode == currentVerifyCode) {
                await Verify.findOneAndDelete({ email });
                return true;
            }
            return false;
        },

        async createUser(email: string, password: string): Promise<UserDoc> {
            const passwordHash = await bcrypt.hash(password, 10);

            // TODO: Better code choosing?
            let selectedCode = 1;
            const usedCodes = await User.find({ username: "Para" })
                .select("usernameCode")
                .sort({ usernameCode: 1 });

            let lastCode = 0;
            for (const user of usedCodes) {
                if (user.usernameCode > lastCode + 1) {
                    selectedCode = lastCode + 1;
                    break;
                }
                lastCode = user.usernameCode;
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
            user.eco![ecoType] += amount;
            await user.save();
        },
    };
}
