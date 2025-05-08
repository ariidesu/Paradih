import { Schema, model, InferSchemaType, Document } from "mongoose";

const PlayResultSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        chartId: { type: String, required: true },

        score: { type: Number, required: true },
        grade: { type: Number, required: true },
        combo: { type: Number, required: true },
        maxCombo: { type: Number, required: true },
        stats: {
            type: new Schema(
                {
                    decrypted: { type: Number, required: true },
                    decrypted_plus: { type: Number, required: true },
                    received: { type: Number, required: true },
                    lost: { type: Number, required: true },
                },
                { _id: false }
            ),
            required: true,
            default: {},
        },
    },
    { timestamps: true }
);
PlayResultSchema.index({ userId: 1, chartId: 1 });

export type PlayResultDoc = InferSchemaType<typeof PlayResultSchema> & Document;
export default model("PlayResult", PlayResultSchema);
