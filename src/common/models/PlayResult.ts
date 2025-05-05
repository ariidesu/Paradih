import { Schema, model } from "mongoose";

const PlayResultSchema = new Schema(
    {
        id: { type: String, required: true, unique: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

        chart: { type: String, required: true },
        score: { type: Number, required: true },
        grade: { type: Number, required: true },
        combo: { type: Number, required: true },
        maxCombo: { type: Number, required: true },
        notes: {
            decrypted: { type: Number, required: true },
            decrypted_plus: { type: Number, required: true },
            received: { type: Number, required: true },
            lost: { type: Number, required: true },
        },
    },
    { timestamps: true }
);

export default model("PlayResult", PlayResultSchema);
