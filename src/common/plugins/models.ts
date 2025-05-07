import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import UserModel from "../models/User";
import UserSaveModel from "../models/UserSave";
import PlayResultModel from "../models/PlayResult";
import MailModel from "../models/Mail";
import VerifyModel from "../models/Verify";

declare module "fastify" {
    interface FastifyInstance {
        models: {
            User: typeof UserModel;
            UserSave: typeof UserSaveModel;
            Mail: typeof MailModel;
            PlayResult: typeof PlayResultModel;
            Verify: typeof VerifyModel;
        };
    }
}

export default fp(async (fastify: FastifyInstance) => {
    fastify.decorate("models", {
        User: UserModel,
        UserSave: UserSaveModel,
        Mail: MailModel,
        PlayResult: PlayResultModel,
        Verify: VerifyModel
    });
});
