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
            const authHeader = request.headers["x-session"];
            if (authHeader == undefined) {
                request.user = null;
                return;
            }

            const payload = app.jwt.verify<{
                userId: string;
                email: string;
                type: "auth" | "api";
            }>(authHeader as string);
            if (payload.type != "auth") {
                request.user = null;
                return;
            }
            const user = await User.findById(payload.userId);

            request.user = user;
        },

        async verifyAuthTokenIgnoringExpiration(
            request: FastifyRequest,
            reply: FastifyReply
        ) {
            const authHeader = request.headers["x-session"];
            if (authHeader == undefined) {
                request.user = null;
                return;
            }

            const payload = app.jwt.verify<{
                userId: string;
                email: string;
                type: "auth" | "api";
            }>(authHeader as string, { ignoreExpiration: true });
            if (payload.type != "auth") {
                request.user = null;
                return;
            }

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

        // https://fastify.dev/docs/latest/Reference/Hooks/#respond-to-a-request-from-a-hook
        verifyApiKey(request: FastifyRequest, reply: FastifyReply) {
            const apiKey = request.headers["x-api-key"];
            if (apiKey != app.config.API_KEY) {
                reply.code(401).send({ code: "AUTH_ERROR", error: "Invalid API key." });
                return reply;
            }
        },

        // API token is only used for API users that are logged in using /login api
        issueApiToken(userId: string, email: string): string {
            return app.jwt.sign(
                { userId: userId, email: email, type: "api" },
                {
                    algorithm: "HS256",
                    expiresIn: "12h",
                }
            );
        },

        async verifyApiToken(request: FastifyRequest, reply: FastifyReply, doNotSendError = false) {
            const authHeader = request.headers["x-auth-token"];
            if (authHeader == undefined) {
                if (!doNotSendError) {
                    reply.code(401).send({ code: "AUTH_ERROR", error: "Invalid API Auth Token." });
                }
                return reply;
            }

            const payload = app.jwt.verify<{
                userId: string;
                email: string;
                type: "auth" | "api";
            }>(authHeader as string, { ignoreExpiration: true });
            if (payload.type != "api") {
                request.user = null;
                reply.code(401).send({ code: "AUTH_ERROR", error: "Invalid API Auth Token." });
                return reply;
            }

            const user = await User.findById(payload.userId);

            request.user = user;
            return true;
        },

        async verifyApiTokenThenApiKey(request: FastifyRequest, reply: FastifyReply) {
            const result = await this.verifyApiToken(request, reply, true);
            if (result !== true) {
                return this.verifyApiKey(request, reply);
            }
        }
    };
}
