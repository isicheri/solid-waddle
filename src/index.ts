import express, { type Application, type Request, type Response } from "express";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { slowDown } from "express-slow-down";
import path from "path";
import HttpError from "./utils/httpError";
import indexRouter from "./routes";
import config from "./config";

const app: Application = express();

// Security Headers with Helmet
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS Configuration
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsers & Cookie Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static Files
app.use(express.static(path.join(process.cwd(), "public")));

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Restriction middleware for uploaded identity documents
app.use("/uploads/identity-docs", (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const ua = req.get("User-Agent") || "unknown";
    const logLine = `${new Date().toISOString()} - IP: ${ip} - UA: ${ua}\n`;
    try {
        fs.appendFileSync(path.join(logsDir, "uploads_access.log"), logLine);
    } catch (e) {
        console.error("Failed to write upload access log:", e);
    }
    // Return a hostile message to deter attackers
    res.status(403).type("text/plain").send("fuck you");
});

// If you ever need to serve the files to trusted users, replace the above with the static middleware.
// app.use("/uploads/identity-docs", express.static(path.join(process.cwd(), "uploads/identity-docs")));

// Adaptive rate limiting (slows down abuse)
const limiter = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 20,
    delayMs: (hits) => hits * 100,
});
app.use(limiter as unknown as express.RequestHandler);

// HTML Page Routes
app.get("/", (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), "src/views", "index.html"));
});

app.get("/signup", (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), "src/views", "signup.html"));
});

app.get("/login", (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), "src/views", "signup.html"));
});

app.get("/dashboard", (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), "src/views", "dashboard.html"));
});

app.get("/work-here", (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), "src/views", "careers.html"));
});

app.get("/learn-more", (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), "src/views", "learn-more.html"));
});

// API Routes
app.use("/api", indexRouter);
app.use("/app", indexRouter);

// Centralized Error Handling Middleware
app.use((err: HttpError, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Security Audit Error]:', err.message);

    try {
        const logsDir = path.join(process.cwd(), "logs");
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        fs.appendFileSync(
            path.join(logsDir, "error-logs.txt"),
            JSON.stringify({
                timestamp: new Date().toISOString(),
                status: err.status || 500,
                errname: err.errname || 'INTERNAL_ERROR',
                message: err.message,
                details: err.errorobj || null
            }) + "\n"
        );
    } catch (logError) {
        console.error("Audit log failed to write:", logError);
    }

    const status = err.status || 500;
    const isClientError = status < 500;
    res.status(status).json({
        success: false,
        error: isClientError ? (err.message || 'Validation failed') : 'An unexpected error occurred while processing your request. Please try again.',
        code: err.errname || 'INTERNAL_ERROR',
        details: isClientError ? (err.errorobj || null) : null
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Requested route not found'
    });
});

const PORT = config.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🔒 Lumen Aether Bank online on port ${PORT}`);
    console.log(`🏦 Web Portal: http://localhost:${PORT}`);
    console.log(`🛡️ Auth Portal: http://localhost:${PORT}/signup`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(process.cwd());
});