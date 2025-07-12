import { Document, Schema, model, InferSchemaType } from "mongoose";

const RankPlaySchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        rankId: { type: String, required: true },
        score: { type: Number, default: 0 },
        resultIds: [{ type: String }],
    },
    { timestamps: true },
);
RankPlaySchema.index({ userId: 1 });

export type RankPlayDoc = InferSchemaType<typeof RankPlaySchema> & Document;
export default model("RankPlay", RankPlaySchema);
