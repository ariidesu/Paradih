import { FastifyInstance } from "fastify";
import type { MailDoc } from "../models/Mail";
import { UserDoc } from "../models/User";

export function buildMailService(app: FastifyInstance) {
    const { Mail } = app.models;

    return {
        async getMails(): Promise<MailDoc[]> {
            const now = new Date();

            const mails = await Mail.find({
                $or: [
                    { expireTime: { $exists: false } },
                    { expireTime: { $gt: now } },
                ],
            });

            return mails;
        },

        async hasReadMail(user: UserDoc, mailId: string) {
            return user.mailsRead.includes(mailId);
        },

        async readMail(user: UserDoc, mailId: string): Promise<MailDoc[]> {
            if (!user.mailsRead.includes(mailId)) {
                user.mailsRead.push(mailId);
                await user.save();
            }

            const mails = await this.getMails();
            return mails.filter(mail => !this.hasReadMail(user, mailId));
        },

        // TODO: sendMail for creation of Mail
    };
}
