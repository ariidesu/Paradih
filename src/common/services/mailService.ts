import { FastifyInstance } from "fastify";
import type { MailDoc } from "../models/Mail";
import { UserDoc } from "../models/User";

export function buildMailService(app: FastifyInstance) {
    const { User, Mail } = app.models;

    return {
        async getMails(user: UserDoc): Promise<MailDoc[]> {
            const mails = await Mail.find({
                $and: [
                    {
                        $or: [
                            { expireAt: { $exists: false } },
                            { expireAt: { $gt: new Date() } },
                        ],
                    },
                    {
                        $or: [
                            { broadcast: true },
                            { receipents: user._id },
                        ],
                    },
                ],
            });

            return mails;
        },

        async getUnreadMails(user: UserDoc): Promise<MailDoc[]> {
            const mails = await this.getMails(user);
            return mails.filter(mail => !user.mailsRead.includes(mail.id));
        },

        async getMailItems(user: UserDoc, mailId: string): Promise<{ type: string, count: number, id: string }[] | null> {
            const mail = await Mail.findById(mailId);
            if (!mail) {
                return null;
            }
            return mail.items;
        },

        async sendMail(sender: string, title: string, content: string, broadcast: boolean, receipents: string[], expireAt: Date, items: [{ type: string, count: number, id: string }] | [], links: [{ addr: string, text: string }] | []): Promise<MailDoc> {
            const result = await Mail.insertOne({
                sender,

                receipents: receipents,
                broadcast,

                title,
                content,

                time: new Date(),
                expireAt,
                items: items,
                link: links,
            });
            return result;
        },

        async hasReadMail(user: UserDoc, mailId: string) {
            return user.mailsRead.includes(mailId);
        },

        async readMail(user: UserDoc, mailId: string): Promise<MailDoc[]> {
            if (!user.mailsRead.includes(mailId)) {
                const result = await User.findByIdAndUpdate(
                    user._id,
                    { $addToSet: { mailsRead: mailId } },
                    { new: true }
                );
                
                if (result) {
                    user.mailsRead = result.mailsRead;
                }
            }

            const mails = await this.getMails(user);
            return mails.filter(mail => !this.hasReadMail(user, mailId));
        },

        // Gameplay-related mails
        async gameplaySendStormyRageMail(user: UserDoc): Promise<void> {
            const existingMail = await Mail.findOne({
                sender: "The Storm",
                title: "The Key",
                receipents: user._id
            });

            if (!existingMail) {
                await app.mailService.sendMail(
                    "The Storm",
                    "The Key",
                    "Please save it properly.",
                    false,
                    [(user._id as any).toString()],
                    new Date(Date.now() + 999999999),
                    [{ type: "bg", count: 1, id: "BGEverlastingRain" }],
                    []
                );
            }
        }
    };
}
