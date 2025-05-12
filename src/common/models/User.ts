import { Document, Schema, model, InferSchemaType } from "mongoose";

const OwnedItemSchema = new Schema(
    {
      id: { type: String, required: true },
      acquiredAt: { type: Date, default: Date.now }
    },
    { _id: false }
  );

const UserSchema = new Schema(
    {
        username: { type: String, required: true },
        usernameCode: { type: Number, required: true },
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },

        rating: { type: Number, default: 0 },
        eco: {
            type: new Schema(
                {
                    ac: { type: Number, default: 0 },
                    dp: { type: Number, default: 0 },
                    navi: { type: Number, default: 0 },
                },
                { _id: false }
            ),
            required: true,
            default: {},
        },
        style: {
            type: new Schema(
                {
                    title: { type: String, default: "NPlaytime0" },
                    background: { type: String, default: "BGDefault" },
                },
                { _id: false }
            ),
            required: true,
            default: {},
        },
        owned: {
            type: new Schema(
                {
                    titles: [OwnedItemSchema],
                    backgrounds: [OwnedItemSchema],
                    purchases: [OwnedItemSchema]
                },
                { _id: false }
            ),
            required: true,
            default: { titles: [], bgs: [], purchases: [] }
        },
        mailsRead: [{ type: String }],
    },
    { timestamps: true }
);
UserSchema.index({ username: 1, usernameCode: 1 }, { unique: true });

export type UserDoc = InferSchemaType<typeof UserSchema> & Document;
export default model("User", UserSchema);