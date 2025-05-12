import { FastifyInstance } from "fastify";
import type { UserSaveDoc } from "../models/UserSave";
import { UserDoc } from "../models/User";

export function buildUserSaveService(app: FastifyInstance) {
    const { UserSave } = app.models;

    return {
        async getSave(user: UserDoc): Promise<UserSaveDoc> {
            // This specifically create a new save entry if not exist
            // Why? Because I don't want to write handling for non-existence save. Yeah. I'm that lazy.
            return UserSave.findOneAndUpdate({ userId: user._id }, {}, { upsert: true, new: true, setDefaultsOnInsert: true });
        },

        async setSave(user: UserDoc, key: string, value: any) {
            await UserSave.findOneAndUpdate(
                { userId: user._id },
                { $set: { [`data.${key}`]: value } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        },

        async setSaves(user: UserDoc, map: {[key: string]: any}) {
            const update: {[key: string]: any} = {};
            for (const [key, value] of Object.entries(map)) {
                update[`data.${key}`] = value;
            }
            
            await UserSave.findOneAndUpdate(
                { userId: user._id },
                { $set: update },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }
    };
}
