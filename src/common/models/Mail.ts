import { Schema, model, InferSchemaType, Document } from "mongoose";

const MailSchema = new Schema({
    sender: { type: String, required: true },
    // If this is not a broadcast mail, specify the recipents
    receipents: [{ type: Schema.Types.ObjectId, ref: "User" }],
    // Indicate whether this mail should be sent to everyone or not
    broadcast: { type: Boolean, required: true, default: false },
    title: { type: String, required: true },
    content: { type: String, required: true },

    time: { type: Date, required: true },
    expireAt: { type: Date, required: true },

    items: [{ type: Schema.Types.Mixed }],
    link: [
        {
            addr: { type: String },
            text: { type: String },
        },
    ],
}, { timestamps: true });

MailSchema.pre("save", function (next) {
    if (this.broadcast && this.receipents.length > 0) {
        return next(new Error("Broadcast mail cannot have specific recipients."));
    }
    if (!this.broadcast && this.receipents.length === 0) {
        return next(new Error("Non-broadcast mail must have at least one recipient."));
    }
    next();
});

export type MailDoc = InferSchemaType<typeof MailSchema> & Document;
export default model("Mail", MailSchema);