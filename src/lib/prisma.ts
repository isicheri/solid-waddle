// Prisma client instance
// Dynamically loads generated PrismaClient once prisma db push / prisma generate is executed

let PrismaClientConstructor: any;

try {
    const prismaModule = require("@prisma/client");
    PrismaClientConstructor = prismaModule.PrismaClient;
} catch {
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
