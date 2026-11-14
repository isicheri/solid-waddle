import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:./dev.db";
}

export const config = {
    PORT: parseInt(process.env.PORT || "3000", 10),
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET || "lumen_aether_bank_super_secret_jwt_key_2026_unhackable_secure_vault_987456!",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
    NODE_ENV: process.env.NODE_ENV || "development",
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_MINUTES: 15,
    ADMIN_KEY: process.env.ADMIN_KEY || "lafp2026!",
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL || "",
};

export default config;



// # 1. Pull the latest updates
// git pull

// # 2. Update the SQLite database schema with the new columns
// npx prisma db push

// # 3. Build the TypeScript files
// npm run build

// # 4. Restart the app in PM2
// pm2 restart lumenaether