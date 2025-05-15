import { FastifyPluginAsync } from "fastify";

const unauthenticatedUserRoutes: FastifyPluginAsync = async (app) => {
    app.post(
        "/register/send_code",
        async (request) => {
            throw new Error("not implemented yippi")
        }
    );

    app.post(
        "/register/verify",
        async (request) => {
            const { email, actionCode } = request.body as { email: string, actionCode: string };
            if (actionCode != "555555") {
                return { status: "failed", code: "INVALID_CODE" };
            }
            let verifyCode = await app.authService.getVerifyCode(email);
            if (verifyCode == null) {
                verifyCode = await app.authService.createVerifyCode(email);
            }
            return { status: "success", code: "OK", data: { verifyCode } };
        }
    );

    app.post(
        "/register/confirm",
        async (request) => {
            const { email, verifyCode, password } = request.body as { email: string, verifyCode: string, password: string };
            if (!await app.authService.checkVerifyCode(email, verifyCode)) {
                return { status: "failed", code: "INVALID_VERIFY_CODE" };
            }
            if (await app.userService.findByEmail(email) != null) {
                return { status: "failed", code: "EMAIL_ALREADY_EXISTS" };
            }

            await app.userService.createUser(email, password);
            return { status: "success", code: "OK", data: {} };
        }
    );

    app.post(
        "/login/status",
        async (request) => {
            const { email } = request.body as { email: string };
            if (!await app.userService.findByEmail(email)) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }
            
            return { status: "success", code: "OK", data: { canBeLoginByPassword: true } } // Since we always force password
        }
    );

    app.post(
        "/login/password",
        async (request) => {
            const { email, password } = request.body as { email: string, verifyCode: string, password: string };
            
            const user = await app.authService.verifyPassword(email, password)
            if (user == null) {
                return { status: "failed", code: "EMAIL_OR_PASSWORD_MISMATCH" };
            }

            const authToken = app.authService.issueAuthToken(user._id as string, email);
            return { status: "success", code: "OK", data: { authToken } };
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
        {
            preHandler: app.authService.verifyAuthTokenIgnoringExpiration
        },
        async (request) => {
            if (!request.user) {
                return { status: "failed", code: "USER_NOT_FOUND" };
            }

            const authToken = app.authService.issueAuthToken(request.user._id as string, request.user.email);
            return { status: "success", code: "OK", data: { authToken } };
        }
    );
};

export default unauthenticatedUserRoutes;