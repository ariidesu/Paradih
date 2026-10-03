import { FastifyPluginAsync } from "fastify";
import type { MailDoc } from "../../../common/models/Mail";
import type { UserDoc } from "../../../common/models/User";

function formatMail(user: UserDoc, mail: MailDoc) {
    return {
        mail_id: mail.id,
        send_time: (mail.createdAt || mail.time).getTime() / 1000,
        expire_time: mail.expireAt.getTime() / 1000,
        sender_name: mail.sender,
        title: mail.title,
        content: mail.content,
        item: mail.items,
        link: mail.link.map((link) => ({
            text: link.text ?? "",
            addr: link.addr ?? "",
        })),
        is_get_item: user.mailsClaimed.includes(mail.id),
        is_read: user.mailsRead.includes(mail.id),
        is_favorite: user.mailsFavorite.includes(mail.id),
    };
}

const mailRoutes: FastifyPluginAsync = async (app) => {
    const options = {
        preHandler: app.authService.verifyAuthToken,
        config: { encrypted: true },
    };

    app.get("/get_list", options, async (request) => {
        if (!request.user) {
            return { status: "failed", code: "USER_NOT_FOUND" };
        }
        const user = request.user;

        const mails = await app.mailService.getMails(user);
        return {
            status: "OK",
            mail: mails.map((mail) => formatMail(user, mail)),
        };
    });

    app.post("/read_mail", options, async (request) => {
        if (!request.user) {
            return { status: "failed", code: "USER_NOT_FOUND" };
        }
        const user = request.user;

        const body = request.body as { mail_id?: unknown } | undefined;
        if (typeof body?.mail_id !== "string") {
            return { status: "error", msg: "Missing info" };
        }
        const mail_id = body.mail_id;
        const mail = (await app.mailService.getMails(user)).find((item) => item.id === mail_id);
        if (!mail) {
            return { status: "failed" };
        }

        await app.mailService.readMail(user, mail_id);
        const mails = await app.mailService.getMails(user);
        return {
            status: "OK",
            mail: mails.map((item) => formatMail(user, item)),
        };
    });

    app.post("/get_mail_item", options, async (request) => {
        if (!request.user) {
            return { status: "failed", code: "USER_NOT_FOUND" };
        }

        const body = request.body as { mail_id?: unknown } | undefined;
        if (typeof body?.mail_id !== "string") {
            return { status: "error", msg: "Missing info" };
        }
        const mail_id = body.mail_id;
        const items = await app.mailService.getMailItems(request.user, mail_id);
        if (!items) {
            return { status: "failed" };
        }

        await app.mailService.claimMail(request.user, mail_id);
        return { status: "OK" };
    });

    app.post("/set_favorite", options, async (request) => {
        if (!request.user) {
            return { status: "failed", code: "USER_NOT_FOUND" };
        }

        const body = request.body as {
            mail_id?: unknown;
            is_favorite?: unknown;
        } | undefined;
        if (typeof body?.mail_id !== "string" || typeof body.is_favorite !== "boolean") {
            return { status: "error", msg: "Missing info" };
        }
        const mail_id = body.mail_id;
        const is_favorite = body.is_favorite;
        const mail = (await app.mailService.getMails(request.user)).find((item) => item.id === mail_id);
        if (!mail) {
            return { status: "failed" };
        }

        await app.userService.setMailFavorite(request.user, mail_id, is_favorite);
        return { status: "OK" };
    });

    app.post("/delete_mail", options, async (request) => {
        if (!request.user) {
            return { status: "failed", code: "USER_NOT_FOUND" };
        }

        const body = request.body as { mail_id?: unknown } | undefined;
        if (typeof body?.mail_id !== "string") {
            return { status: "error", msg: "Missing info" };
        }
        const mail_id = body.mail_id;
        const mail = (await app.mailService.getMails(request.user)).find((item) => item.id === mail_id);
        if (!mail) {
            return { status: "failed" };
        }

        await app.userService.deleteMail(request.user, mail_id);
        return { status: "OK" };
    });

    app.get("/delete_all", options, async (request) => {
        if (!request.user) {
            return { status: "failed", code: "USER_NOT_FOUND" };
        }

        const mails = await app.mailService.getMails(request.user);
        await app.userService.deleteAllMails(request.user, mails.map((mail) => mail.id));
        return { status: "OK" };
    });
};

export default mailRoutes;
