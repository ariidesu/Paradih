import { Document, Schema, model, InferSchemaType } from "mongoose";

const VerifySchema = new Schema(
    {
        code: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true }
    },
    { timestamps: true }
);

export type VerifyDoc = InferSchemaType<typeof VerifySchema> & Document;
export default model("Verify", VerifySchema);