import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import HttpError from '../utils/httpError';
import config from '../config';
import prisma from '../lib/prisma';

// Extend Express Request type to include authenticated user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
                username: string;
            };
        }
    }
}

export interface JWTPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Extract token from Authorization header or HTTP-only cookie
        let token: string | undefined;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            throw new HttpError('Authentication required. No valid session token provided.', 401, 'UNAUTHORIZED', null);
        }

        // Verify token with cryptographic secret
        const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

        if (!decoded || !decoded.userId) {
            throw new HttpError('Invalid authentication token payload.', 401, 'INVALID_TOKEN', null);
        }

        // Check if user exists in the database and is active
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                username: true,
                emailVerified: true,
                lockedUntil: true
            },
        });

        if (!user) {
            throw new HttpError('User account not found.', 401, 'USER_NOT_FOUND', null);
        }

        // if (!user.isActive) {
        //     throw new HttpError('Account has been deactivated. Please contact bank security.', 403, 'ACCOUNT_DEACTIVATED', null);
        // }

        // Check for temporary account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
            throw new HttpError(`Account is temporarily locked due to security policy. Try again in ${minutesLeft} minute(s).`, 403, 'ACCOUNT_LOCKED', null);
        }

        if (!user.emailVerified) {
            throw new HttpError('Email verification required before accessing bank services.', 403, 'EMAIL_NOT_VERIFIED', null);
        }

        // Attach safe user identity to request
        req.user = {
            userId: user.id,
            email: user.email,
            username: user.username
        };

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            next(new HttpError('Session expired. Please sign in again.', 401, 'TOKEN_EXPIRED', null));
        } else if (error instanceof jwt.JsonWebTokenError) {
            next(new HttpError('Invalid authentication signature.', 401, 'INVALID_TOKEN', null));
        } else {
            next(error);
        }
    }
};

export default authMiddleware;