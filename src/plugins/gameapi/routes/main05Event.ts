import { FastifyPluginAsync } from "fastify";

const PHASE_CONFIG = [
    { id: "phase01", player_hp: 1, non_p_decrypted_damage: -1, received_damage: -1, lost_damage: -1 },
    { id: "phase02", player_hp: 5, non_p_decrypted_damage: -1, received_damage: -2, lost_damage: -5 },
    { id: "phase03", player_hp: 20, non_p_decrypted_damage: -1, received_damage: -2, lost_damage: -4 },
    { id: "phase04", player_hp: 100, non_p_decrypted_damage: -1, received_damage: -5, lost_damage: -10 },
    { id: "phase05", player_hp: 100, non_p_decrypted_damage: 0, received_damage: -2, lost_damage: -5 },
    { id: "phase06", player_hp: 200, non_p_decrypted_damage: 0, received_damage: -2, lost_damage: -5 },
    { id: "phase07", player_hp: 500, non_p_decrypted_damage: 0, received_damage: -2, lost_damage: -5 },
    { id: "phase08", player_hp: 999, non_p_decrypted_damage: 0, received_damage: -1, lost_damage: -1 },
];

const main05EventRoutes: FastifyPluginAsync = async (app) => {
    const options = {
        preHandler: app.authService.verifyAuthToken,
        config: { encrypted: true },
    };

    app.get("/config", options, async () => ({
        status: "ok",
        data: PHASE_CONFIG,
    }));

    app.get("/event_status", options, async (request) => {
        if (!request.user) {
            return { status: "failed", code: "USER_NOT_FOUND" };
        }

        return {
            status: "ok",
            now_boss_hp: 0,
            now_phase: PHASE_CONFIG.length,
            user_damaged: 0,
            is_completed: false,
            now_phase_boss_max_hp: 0,
            can_attack: false,
        };
    });

    app.get("/start_challenge", options, async (request) => {
        if (!request.user) {
            return { status: "failed", code: "USER_NOT_FOUND" };
        }

        return { status: "failed", reason: 0 };
    });
};

export default main05EventRoutes;
