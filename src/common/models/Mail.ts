import { Schema, model, InferSchemaType, Document } from "mongoose";

const MailSchema = new Schema({
    id: { type: String, required: true, unique: true },

    sender: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },

    time: { type: Date, required: true },
    expireAt: { type: Date },

    items: [{ type: Schema.Types.Mixed }],
    link: [
        {
            addr: { type: String },
            text: { type: String },
        },
    ],
}, { timestamps: true });

export type MailDoc = InferSchemaType<typeof MailSchema> & Document;
export default model("Mail", MailSchema);