import { FastifyInstance } from "fastify";
import type { UserDoc } from "../models/User";

export function buildAnnouncementService(app: FastifyInstance) {
    return {
        getAnnouncements(user: UserDoc) {
            return app.gameDataService.getAnnouncements().map((announcement) => ({
                anno_id: announcement.id,
                anno_level: announcement.level,
                content: announcement.content,
                link: announcement.link,
                send_time: announcement.sendTime,
                title: announcement.title,
                update_time: announcement.updateTime,
                is_read: user.announcementsRead.includes(announcement.id),
            }));
        },
    };
}
