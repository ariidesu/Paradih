import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyJwt, { JWT } from "@fastify/jwt";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import type { UserDoc } from "../models/User";

declare module "fastify" {
    interface FastifyInstance {
        jwt: JWT;
    }
}

export function buildAuthService(app: FastifyInstance) {
    const { User, Verify } = app.models;

    app.register(fastifyJwt, {
        secret: process.env.JWT_SECRET!,
    });

    return {
        async verifyPassword(
            email: string,
            password: string
        ): Promise<UserDoc | null> {
            const user = await User.findOne({ email });
            if (!user) return null;

            const ok = await bcrypt.compare(password, user.passwordHash);
            if (!ok) return null;
            return user;
        },

        issueAuthToken(userId: string, email: string): string {
            return app.jwt.sign(
                { userId: userId, email: email, type: "auth" },
                {
                    algorithm: "HS256",
                    expiresIn: "1d",
                }
            );
        },

        async verifyAuthToken(request: FastifyRequest, reply: FastifyReply) {
            const authHeader = request.headers["X-Session"];
            if (authHeader == undefined) {
                request.user = null;
                return;
            }

            const payload = app.jwt.verify<{
                userId: string;
                email: string;
                type: "auth";
            }>(authHeader as string);
            const user = await User.findById(payload.userId);

            request.user = user;
        },

        async verifyAuthTokenIgnoringExpiration(
            request: FastifyRequest,
            reply: FastifyReply
        ) {
            const authHeader = request.headers["X-Session"];
            if (authHeader == undefined) {
                request.user = null;
                return;
            }

            const payload = app.jwt.verify<{
                userId: string;
                email: string;
                type: "auth";
            }>(authHeader as string, { ignoreExpiration: true });
            const user = await User.findById(payload.userId);

            request.user = user;
        },

        async createVerifyCode(email: string): Promise<string> {
            if ((await this.getVerifyCode(email)) != null) {
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

        async checkVerifyCode(
            email: string,
            verifyCode: string
        ): Promise<boolean> {
            // TODO: verifyCode expiration
            const currentVerifyCode = await this.getVerifyCode(email);
            if (verifyCode == currentVerifyCode) {
                await Verify.findOneAndDelete({ email });
                return true;
            }
            return false;
        },
    };
}
