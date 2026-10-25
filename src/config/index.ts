import dotenv from "dotenv";

dotenv.config();

export const config = {
    PORT: parseInt(process.env.PORT || "3000", 10),
    JWT_SECRET: process.env.JWT_SECRET || "lumen_aether_bank_super_secret_jwt_key_2026_unhackable_secure_vault_987456!",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
    NODE_ENV: process.env.NODE_ENV || "development",
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_MINUTES: 15,
};

export default config;
