import { FastifyPluginAsync } from 'fastify';
import { UserDoc } from '../../../common/models/User';

const usersRoutes: FastifyPluginAsync = async (app) => {
    app.get(
        "/:userId",
        { preHandler: app.authService.verifyApiKey },
        async (request, reply) => {
            const { userId } = request.params as { userId: string };
            if (!userId) {
                reply.statusCode = 400;
                return { code: "INVALID_REQUEST", message: "User ID is required." };
            }

            const user = await app.userService.findById(userId);
            if (!user) {
                reply.statusCode = 404;
                return { code: "USER_NOT_FOUND", message: "User not found." };
            }

            return { code: "OK", data: {
                _id: user._id,
                username: user.username,
                usernameCode: user.usernameCode,
                rating: user.rating,
                eco: user.eco,
                style: user.style,
                owned: user.owned,
                createdAt: user.createdAt.getTime(),
                updatedAt: user.updatedAt.getTime()
            } };
        }
    )

    app.patch(
        "/:userId",
        { preHandler: app.authService.verifyApiKey },
        async (request, reply) => {
            const { userId } = request.params as { userId: string };
            if (!userId) {
                reply.statusCode = 400;
                return { code: "INVALID_REQUEST", message: "User ID is required." };
            }

            const user = await app.userService.findById(userId);
            if (!user) {
                reply.statusCode = 404;
                return { code: "USER_NOT_FOUND", message: "User not found." };
            }

            const { username, usernameCode, password } = request.body as { username: string, usernameCode: number, password: string };
            if (username && usernameCode) {
                const existingUser = await app.userService.findByNameAndCode(username, usernameCode);
                if (existingUser && existingUser._id !== userId) {
                    reply.statusCode = 409;
                    return { code: "USERNAME_TAKEN", message: "Username is already taken." };
                }
                await app.userService.changeUsername(user, username, usernameCode);
            } else if (username || usernameCode) {
                reply.statusCode = 400;
                return { code: "INVALID_REQUEST", message: "Both username and usernameCode are required." };
            }
            if (password) {
                const hashedPassword = await app.userService.hashPassword(password);
                await app.userService.changePassword(user, hashedPassword);
            }

            return { code: "OK" };
        }
    )

    app.get(
        "/batch",
        { preHandler: app.authService.verifyApiKey },
        async (request, reply) => {
            const { userIds } = request.query as { userIds: string };
            if (!userIds) {
                reply.statusCode = 400;
                return { code: "INVALID_REQUEST", message: "User IDs are required." };
            }

            const ids = userIds.split(",").map((id) => id.trim());
            const users: UserDoc[] = [];
            for (const id of ids) {
                const user = await app.userService.findById(id);
                if (user) {
                    users.push(user);
                }
            }

            return { code: "OK", data: users.map(user => ({
                _id: user._id,
                username: user.username,
                usernameCode: user.usernameCode,
                rating: user.rating,
                eco: user.eco,
                style: user.style,
                owned: user.owned,
                createdAt: user.createdAt.getTime(),
                updatedAt: user.updatedAt.getTime()
            })) };
        }
    )

    app.delete(
        "/:userId",
        { preHandler: app.authService.verifyApiKey },
        async (request, reply) => {
            const { userId } = request.params as { userId: string };
            if (!userId) {
                reply.statusCode = 400;
                return { code: "INVALID_REQUEST", message: "User ID is required." };
            }

            const user = await app.userService.findById(userId);
            if (!user) {
                reply.statusCode = 404;
                return { code: "USER_NOT_FOUND", message: "User not found." };
            }

            await app.userService.deleteUser(userId);
            return { code: "OK" };
        }
    );

    app.get(
        "/email/:email",
        { preHandler: app.authService.verifyApiKey },
        async (request, reply) => {
            const { email } = request.params as { email: string };
            if (!email) {
                reply.statusCode = 400;
                return { code: "INVALID_REQUEST", message: "Email is required." };
            }

            const user = await app.userService.findByEmail(email);
            if (!user) {
                reply.statusCode = 404;
                return { code: "USER_NOT_FOUND", message: "User not found." };
            }

            return { code: "OK", data: {
                _id: user._id,
                username: user.username,
                usernameCode: user.usernameCode,
                rating: user.rating,
                eco: user.eco,
                style: user.style,
                owned: user.owned,
                createdAt: user.createdAt.getTime(),
                updatedAt: user.updatedAt.getTime()
            } };
        }
    );

    app.patch(
        "/email/:email",
        { preHandler: app.authService.verifyApiKey },
        async (request, reply) => {
            const { email } = request.params as { email: string };
            if (!email) {
                reply.statusCode = 400;
                return { code: "INVALID_REQUEST", message: "Email is required." };
            }

            const user = await app.userService.findByEmail(email);
            if (!user) {
                reply.statusCode = 404;
                return { code: "USER_NOT_FOUND", message: "User not found." };
            }

            const { username, usernameCode, password } = request.body as { username: string, usernameCode: number, password: string };
            if (username && usernameCode) {
                const existingUser = await app.userService.findByNameAndCode(username, usernameCode);
                if (existingUser && existingUser._id !== user._id) {
                    reply.statusCode = 409;
                    return { code: "USERNAME_TAKEN", message: "Username is already taken." };
                }
                await app.userService.changeUsername(user, username, usernameCode);
            } else if (username || usernameCode) {
                reply.statusCode = 400;
                return { code: "INVALID_REQUEST", message: "Both username and usernameCode are required." };
            }
            if (password) {
                const hashedPassword = await app.userService.hashPassword(password);
                await app.userService.changePassword(user, hashedPassword);
            }

            return { code: "OK" };
        }
    );

    app.post(
        "/auth/register",
        { preHandler: app.authService.verifyApiKey },
        async (request, reply) => {
            const { email, password } = request.body as { email: string, password: string };
            if (!email || !password) {
                reply.statusCode = 400;
                return { code: "INVALID_REQUEST", message: "Email and password are required." };
            }

            const existingUser = await app.userService.findByEmail(email);
            if (existingUser) {
                reply.statusCode = 409;
                return { code: "USER_ALREADY_EXISTS", message: "User already exists." };
            }

            const user = await app.userService.createUser(email, password);
            await app.userService.addOwnedItem(user, "backgrounds", "BGDefault");
            const token = app.authService.issueApiToken(user._id as string, user.email);
            return { code: "OK", data: { token, userId: user._id } };
        }
    )

    app.post(
        "/auth/login",
        async (request, reply) => {
            const { email, password } = request.body as { email: string, password: string };
            if (!email || !password) {
                reply.statusCode = 400;
                return { code: "INVALID_REQUEST", message: "Email and password are required." };
            }

            const user = await app.authService.verifyPassword(email, password);
            if (!user) {
                reply.statusCode = 401;
                return { code: "INVALID_CREDENTIALS", message: "Invalid email or password." };
            }

            const token = app.authService.issueApiToken(user._id as string, user.email);
            return { code: "OK", data: { token, userId: user._id } };
        }
    );

    app.post(
        "/auth/email/send_code",
        async (request, reply) => {
            const { email } = request.body as { email: string };
            if (!email) {
                reply.statusCode = 400;
                return { code: "INVALID_REQUEST", message: "Email is required." };
            }

            const newCode = app.authService.createApiActionCode(email);

            try {
                await app.mail.sendMail({
                    from: app.config.SMTP_FROM,
                    to: email,
                    subject: "Account action - Verification Code",
                    text: `An application is requesting access to your account. Your verification code is: ${newCode}`
                });

            } catch (error: any) {
                return { code: "INVALID_REQUEST", message: `Failed to send verification code email: ${error.message ?? "Unknown error"}` };
            }

            return { code: "OK" };
        }
    );

    app.get(
        "/auth/email/:email/has_pending_action",
        async (request, reply) => {
            const { email } = request.params as { email: string };
            return { code: "OK", data: { hasPendingAction: app.authService.hasApiActionCodePending(email) } };
        }
    );

    app.post(
        "/auth/email/confirm",
        async (request, reply) => {
            const { email, code } = request.body as { email: string, code: string };
            if (!email || !code) {
                reply.statusCode = 400;
                return { code: "INVALID_REQUEST", message: "Email and code are required." };
            }
            const [success, expired] = app.authService.verifyApiActionCode(email, code);
            if (!success) {
                reply.statusCode = 401;
                return { code: expired ? "CODE_EXPIRED" : "INVALID_CODE", message: expired ? "The code has expired." : "The code is invalid." };
            }
            const user = await app.userService.findByEmail(email);
            if (!user) {
                reply.statusCode = 404;
                return { code: "USER_NOT_FOUND", message: "User not found." };
            }

            const token = app.authService.issueApiToken(user._id as string, user.email);
            return { code: "OK", data: { token, userId: user._id } };
        }
    );

    app.post(
        "/auth/api_key",
        { preHandler: app.authService.verifyApiKey },
        async (request, reply) => {
            const { email } = request.body as { email: string };
            if (!email) {
                reply.statusCode = 400;
                return { code: "INVALID_REQUEST", message: "Email is required." };
            }

            const user = await app.userService.findByEmail(email);
            if (!user) {
                reply.statusCode = 404;
                return { code: "USER_NOT_FOUND", message: "User not found." };
            }

            const token = app.authService.issueApiToken(user._id as string, user.email);
            return { code: "OK", data: { token, userId: user._id } };
        }
    );
}

export default usersRoutes;