// scripts/create-user.js
// Standalone script to create or reset a test bank user directly in SQLite / Prisma
require('dotenv').config();

// Ensure DATABASE_URL fallback if not defined in .env
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:./prisma/dev.db";
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function generateAccountNumber(prefix = "40") {
    let unique = false;
    let acc = "";
    while (!unique) {
        const p1 = Math.floor(1000000 + Math.random() * 9000000).toString();
        const p2 = Math.floor(1000000 + Math.random() * 9000000).toString();
        acc = `${prefix}${p1}${p2}`;
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { accountNumber: acc },
                    { savingsAccountNumber: acc }
                ]
            }
        });
        if (!existing) unique = true;
    }
    return acc;
}

async function main() {
    // Read command line args or use reliable defaults
    const email = (process.argv[2] || "testuser@lumenbank.com").toLowerCase().trim();
    const password = process.argv[3] || "Password123!";
    const fullName = process.argv[4] || "Test User";
    const phoneNumber = process.argv[5] || `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    console.log(`\n==========================================`);
    console.log(`🏦  Lumen Aether Bank - User Provisioning`);
    console.log(`==========================================`);
    console.log(`Creating/Updating test user: ${email}...`);

    const hashedPassword = await bcrypt.hash(password, 12);
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        // Reset password & unlock if exists
        const updated = await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                emailVerified: true,
                failedLoginAttempts: 0,
                lockedUntil: null
            }
        });

        console.log(`\n✅ Account already exists! Password updated successfully.`);
        console.log(`------------------------------------------`);
        console.log(`👤 Name:            ${updated.fullName}`);
        console.log(`📧 Email:           ${updated.email}`);
        console.log(`🔑 Password:        ${password}`);
        console.log(`💳 Chequing Acc:    ${updated.accountNumber} ($${updated.balance.toFixed(2)})`);
        console.log(`💰 Savings Acc:     ${updated.savingsAccountNumber || 'N/A'} ($${updated.savingsBalance.toFixed(2)})`);
        console.log(`------------------------------------------`);
        console.log(`👉 You can now log in at /login or /signup with these credentials.\n`);
        return;
    }

    // New user creation
    const baseUsername = fullName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    let username = baseUsername;
    let counter = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}_${counter++}`;
    }

    const chequingAcc = await generateAccountNumber("40");
    const savingsAcc = await generateAccountNumber("50");
    const savingsGift = 500000.00;

    const newUser = await prisma.user.create({
        data: {
            fullName,
            username,
            email,
            phoneNumber,
            password: hashedPassword,
            accountNumber: chequingAcc,
            balance: 0.00,
            savingsAccountNumber: savingsAcc,
            savingsBalance: savingsGift,
            emailVerified: true,
            transactions: {
                create: {
                    type: "CREDIT",
                    title: "High-Yield Savings Welcome Bonus",
                    category: "Deposit",
                    amount: savingsGift,
                    status: "COMPLETED"
                }
            }
        }
    });

    console.log(`\n🎉 New Test User Created Successfully!`);
    console.log(`------------------------------------------`);
    console.log(`👤 Name:            ${newUser.fullName}`);
    console.log(`📧 Email:           ${newUser.email}`);
    console.log(`🔑 Password:        ${password}`);
    console.log(`📱 Phone:           ${newUser.phoneNumber}`);
    console.log(`💳 Chequing Acc:    ${newUser.accountNumber} ($${newUser.balance.toFixed(2)})`);
    console.log(`💰 Savings Acc:     ${newUser.savingsAccountNumber} ($${newUser.savingsBalance.toFixed(2)})`);
    console.log(`------------------------------------------`);
    console.log(`👉 You can now log in at /login or /signup with these credentials.\n`);
}

main()
    .catch((err) => {
        console.error("\n❌ Error provisioning test user:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

