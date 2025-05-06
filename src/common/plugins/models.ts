import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import UserModel from "../models/User";
import PlayResultModel from "../models/PlayResult";
import MailModel from "../models/Mail";
import VerifyModel from "../models/Verify";

declare module "fastify" {
    interface FastifyInstance {
        models: {
            User: typeof UserModel;
            Mail: typeof MailModel;
            PlayResult: typeof PlayResultModel;
            Verify: typeof VerifyModel;
        };
    }
}

export default fp(async (fastify: FastifyInstance) => {
    fastify.decorate("models", {
        User: UserModel,
        Mail: MailModel,
        PlayResult: PlayResultModel,
        Verify: VerifyModel
    });
});
