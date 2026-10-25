import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authController } from "./auth.controller";
import { responseHandler } from "../../utils/resposeHandler";
import { Authservice } from "./auth.sevice";
import { authMiddleware } from "../../middleware/auth.middleware";

const authService = new Authservice();
const authcontroller = authController(authService);

const authRouter: Router = Router();

// Strict rate limiter for authentication endpoints to prevent brute force / credential stuffing attacks
const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 25, // limit each IP to 25 auth attempts per 15 minutes
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many login/registration attempts from this network. Please try again later for your security."
    }
});

// User registration
authRouter.post("/signup", authRateLimiter, responseHandler(authcontroller.signup));

// User signin
authRouter.post("/signin", authRateLimiter, responseHandler(authcontroller.login));
authRouter.post("/login", authRateLimiter, responseHandler(authcontroller.login));

// Authenticated user session & profile
authRouter.get("/me", authMiddleware, responseHandler(authcontroller.getMe));

// Bank fund transfer (protected by JWT auth)
authRouter.post("/transfer", authMiddleware, responseHandler(authcontroller.transfer));

// Logout (clear session cookie)
authRouter.post("/logout", responseHandler(authcontroller.logout));

export default authRouter;