import { Response, Request } from "express";
import HttpError from "../../utils/httpError";
import { Authservice } from "./auth.sevice";
import {
    formatZodValidationError,
    LoginSchema,
    SignupSchema,
    TransferSchema
} from "./schema/schema";

export interface IAuthController {
    signup: (req: Request, res: Response) => Promise<void>;
    login: (req: Request, res: Response) => Promise<void>;
    getMe: (req: Request, res: Response) => Promise<void>;
    transfer: (req: Request, res: Response) => Promise<void>;
    logout: (req: Request, res: Response) => Promise<void>;
}

const isHttpsRequest = (req: Request): boolean => {
    return Boolean(req.secure || req.headers["x-forwarded-proto"] === "https");
};

export const authController = (authservice: Authservice): IAuthController => {
    return {
        signup: async (req: Request, res: Response) => {
            const parsed = SignupSchema.safeParse(req.body);

            if (!parsed.success) {
                const errors = formatZodValidationError(parsed);
                throw new HttpError('Validation failed', 400, 'VALIDATION_ERROR', errors);
            }

            const result = await authservice.register(parsed.data);

            // Set secure HTTP-only cookie for bank session
            res.cookie("token", result.token, {
                httpOnly: true,
                secure: isHttpsRequest(req),
                sameSite: "lax",
                maxAge: 60 * 60 * 1000 // 1 hour
            });

            res.status(201).json(result);
        },

        login: async (req: Request, res: Response) => {
            const parsed = LoginSchema.safeParse(req.body);

            if (!parsed.success) {
                const errors = formatZodValidationError(parsed);
                throw new HttpError('Validation failed', 400, 'VALIDATION_ERROR', errors);
            }

            const result = await authservice.login(parsed.data);

            // Set secure HTTP-only cookie for bank session
            res.cookie("token", result.token, {
                httpOnly: true,
                secure: isHttpsRequest(req),
                sameSite: "lax",
                maxAge: 60 * 60 * 1000 // 1 hour
            });

            res.status(200).json(result);
        },

        getMe: async (req: Request, res: Response) => {
            if (!req.user || !req.user.userId) {
                throw new HttpError('Unauthorized', 401, 'UNAUTHORIZED', null);
            }

            const result = await authservice.getProfile(req.user.userId);
            res.status(200).json(result);
        },

        transfer: async (req: Request, res: Response) => {
            if (!req.user || !req.user.userId) {
                throw new HttpError('Unauthorized', 401, 'UNAUTHORIZED', null);
            }

            const parsed = TransferSchema.safeParse(req.body);
            if (!parsed.success) {
                const errors = formatZodValidationError(parsed);
                throw new HttpError('Validation failed', 400, 'VALIDATION_ERROR', errors);
            }

            const result = await authservice.transfer(req.user.userId, parsed.data);
            res.status(200).json(result);
        },

        logout: async (req: Request, res: Response) => {
            res.clearCookie("token", {
                httpOnly: true,
                sameSite: "lax",
                secure: isHttpsRequest(req)
            });

            res.status(200).json({
                success: true,
                message: "Signed out successfully"
            });
        }

    };
};