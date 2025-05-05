import { Document, Schema, model, InferSchemaType } from "mongoose";

const UserSchema = new Schema(
    {
        username: { type: String, required: true },
        usernameCode: { type: Number, required: true },
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },

        rating: { type: Number, default: 0 },
        eco: {
            ac: { type: Number, default: 0 },
            dp: { type: Number, default: 0 },
            navi: { type: Number, default: 0 },
        },
        style: {
            title: { type: String, default: "NPlaytime0" },
            background: { type: String, default: "BGDefault" },
        },
        owned: [{ type: String }],
        mailsRead: [{ type: String }],
    },
    { timestamps: true }
);
UserSchema.index({ username: 1, usernameCode: 1 }, { unique: true });

export type UserDoc = InferSchemaType<typeof UserSchema> & Document;
export default model("User", UserSchema);