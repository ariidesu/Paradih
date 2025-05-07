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
            const save = await this.getSave(user);
            save.data.set(key, value);
            
            await save.save();
        },

        async setSaves(user: UserDoc, map: {[key: string]: any}) {
            const save = await this.getSave(user);
            for (const [key, value] of Object.entries(map)) {
                save.data.set(key, value);
            }
            
            await save.save();
        }
    };
}
