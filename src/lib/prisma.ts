// Prisma client instance
// Ensures env vars (and SQLite fallback) are loaded before instantiating PrismaClient
import "../config";

let PrismaClientConstructor: any;

try {
    const prismaModule = require("@prisma/client");
    PrismaClientConstructor = prismaModule.PrismaClient;
} catch (err) {
    console.error("[Prisma Init Error]: Failed to load @prisma/client. Run `npx prisma generate` on this host.", err);
    PrismaClientConstructor = class FallbackPrismaClient {
        user = {};
        transaction = {};
        $transaction = async (fn: any) => fn(this);
    };
}

declare global {
    var prisma: any;
}

export const prisma: any = global.prisma || (PrismaClientConstructor ? new PrismaClientConstructor() : {});

if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}

export default prisma;
