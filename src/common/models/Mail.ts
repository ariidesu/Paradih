import { Schema, model } from "mongoose";

const MailSchema = new Schema({
    id: { type: String, required: true, unique: true },

    sender: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },

    time: { type: Date, required: true },
    expireTime: { type: Date },

    items: [{ type: Schema.Types.Mixed }],
    link: [
        {
            addr: { type: String },
            text: { type: String },
        },
    ],
});

export default model("Mail", MailSchema);
