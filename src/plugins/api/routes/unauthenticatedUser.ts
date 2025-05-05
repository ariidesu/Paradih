import { FastifyPluginAsync } from "fastify";

const unauthenticatedUserRoutes: FastifyPluginAsync = async (app) => {
    app.post(
        "/register/sendCode",
        async (request) => {
            throw new Error("not implemented yippi")
        }
    );

    app.post(
        "/register/verify",
        async (request) => {
            throw new Error("not implemented yippi")
        }
    );

    app.post(
        "/register/confirm",
        async (request) => {
            throw new Error("not implemented yippi")
        }
    );

    app.post(
        "/login/status",
        async (request) => {
            throw new Error("not implemented yippi")
        }
    );

    app.post(
        "/login/password",
        async (request) => {
            throw new Error("not implemented yippi")
        }
    );

    app.post(
        "/login/email/send_code",
        async (request) => {
            throw new Error("not implemented yippi")
        }
    );

    app.post(
        "/login/email/confirm",
        async (request) => {
            throw new Error("not implemented yippi")
        }
    );

    app.post(
        "/refresh_token",
        async (request) => {
            throw new Error("not implemented yippi")
        }
    );
};

export default unauthenticatedUserRoutes;