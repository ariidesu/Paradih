import { Schema, model, InferSchemaType, Document } from "mongoose";

const UserSaveSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    data: { type: Map, of: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export type UserSaveDoc = InferSchemaType<typeof UserSaveSchema> & Document;
export default model("UserSave", UserSaveSchema);