import { Schema, model } from "mongoose";

const BattleParticipationSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        roomId: { type: String, required: true },
        opponentId: { type: String, required: true },
        reportedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

BattleParticipationSchema.index({ userId: 1, roomId: 1 }, { unique: true });

export default model("BattleParticipation", BattleParticipationSchema);
