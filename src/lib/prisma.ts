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

/**
 * Self-heals the SQLite database schema if new columns are missing on disk
 */
export async function ensureDatabaseSchema() {
    try {
        if (!prisma || typeof prisma.$executeRawUnsafe !== "function") return;
        await prisma.$executeRawUnsafe(`ALTER TABLE "AccountVerificationData" ADD COLUMN "employmentStatus" TEXT;`).catch(() => {});
        await prisma.$executeRawUnsafe(`ALTER TABLE "AccountVerificationData" ADD COLUMN "occupation" TEXT;`).catch(() => {});
        await prisma.$executeRawUnsafe(`ALTER TABLE "AccountVerificationData" ADD COLUMN "annualIncome" TEXT;`).catch(() => {});
    } catch (e) {
        // Safe to ignore if already exists
    }
}

// Auto-run schema self-heal on boot
ensureDatabaseSchema().catch(() => {});

export default prisma;
