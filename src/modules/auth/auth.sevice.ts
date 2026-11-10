import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import HttpError from "../../utils/httpError";
import { LoginInput, SignupInput, TransferInput } from "./schema/schema";
import prisma from "../../lib/prisma";
import config from "../../config";

// Simulated dummy hash to prevent timing attacks on nonexistent user lookups
const DUMMY_HASH = "$2a$12$e8Yx9p8vJ6mD6Tz0j9Ywxe7L4iP4T8uK9rL7yA4oE1eC0rN1hE9zG";

export class Authservice {

    /**
     * Generate a unique 16-digit bank account number
     */
    private async generateUniqueAccountNumber(): Promise<string> {
        let unique = false;
        let accountNumber = "";

        while (!unique) {
            // High security random 16-digit account starting with 40 (40XX XXXX XXXX XXXX)
            const part1 = Math.floor(1000000 + Math.random() * 9000000).toString();
            const part2 = Math.floor(1000000 + Math.random() * 9000000).toString();
            accountNumber = `40${part1}${part2}`;

            const existing = await prisma.user.findFirst({
                where: {
                    OR: [
                        { accountNumber },
                        { savingsAccountNumber: accountNumber }
                    ]
                }
            });

            if (!existing) {
                unique = true;
            }
        }

        return accountNumber;
    }

    /**
     * Generate a unique 16-digit bank account number for High-Yield Savings (starting with 50)
     */
    private async generateUniqueSavingsAccountNumber(): Promise<string> {
        let unique = false;
        let savingsAccountNumber = "";

        while (!unique) {
            const part1 = Math.floor(1000000 + Math.random() * 9000000).toString();
            const part2 = Math.floor(1000000 + Math.random() * 9000000).toString();
            savingsAccountNumber = `50${part1}${part2}`;

            const existing = await prisma.user.findFirst({
                where: {
                    OR: [
                        { accountNumber: savingsAccountNumber },
                        { savingsAccountNumber }
                    ]
                }
            });

            if (!existing) {
                unique = true;
            }
        }

        return savingsAccountNumber;
    }

    /**
     * User registration with password hashing, account creation, and welcome balance
     */
    async register(body: SignupInput) {
        const { fullName, email, phoneNumber, password } = body;

        // 1️⃣ Check if email already exists
        const existingEmail = await prisma.user.findUnique({
            where: { email }
        });

        if (existingEmail) {
            throw new HttpError('An account with this email address already exists', 409, 'DUPLICATE_EMAIL', {
                field: 'email'
            });
        }

        // 2️⃣ Check if phone number already exists
        const existingPhone = await prisma.user.findUnique({
            where: { phoneNumber }
        });

        if (existingPhone) {
            throw new HttpError('An account with this phone number already exists', 409, 'DUPLICATE_PHONE', {
                field: 'phoneNumber'
            });
        }

        // 3️⃣ Generate unique username
        const baseUsername = (body.username || fullName.replace(/[^a-zA-Z0-9]/g, '_')).toLowerCase();
        let username = baseUsername;
        let counter = 1;
        while (await prisma.user.findUnique({ where: { username } })) {
            username = `${baseUsername}_${counter++}`;
        }

        // 4️⃣ Generate unique Chequing & Savings bank account numbers
        const accountNumber = await this.generateUniqueAccountNumber();
        const savingsAccountNumber = await this.generateUniqueSavingsAccountNumber();

        // 5️⃣ Cryptographically secure password hash (Salt rounds = 12)
        const hashedPassword = await bcrypt.hash(password, 12);

        // 6️⃣ Create user with Chequing ($0.00) and Savings loaded with $500,000.00 gift
        const chequingBalance = 0.00;
        const savingsGift = 500000.00;

        const user = await prisma.user.create({
            data: {
                fullName,
                username,
                email,
                phoneNumber,
                password: hashedPassword,
                accountNumber,
                balance: chequingBalance,
                savingsAccountNumber,
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
            },
            select: {
                id: true,
                fullName: true,
                username: true,
                email: true,
                phoneNumber: true,
                accountNumber: true,
                balance: true,
                savingsAccountNumber: true,
                savingsBalance: true,
                createdAt: true
            }
        });

        // 7️⃣ Generate signed JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            config.JWT_SECRET as jwt.Secret,
            { expiresIn: config.JWT_EXPIRES_IN as any }
        );

        return {
            success: true,
            message: "Bank account created successfully",
            token,
            user
        };
    }

    /**
     * User login with brute force protection, timing attack mitigation, and JWT creation
     */
    async login(body: LoginInput) {
        const { email, password } = body;

        // 1️⃣ Fetch user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });

        // 2️⃣ Mitigate timing attack & user enumeration:
        // Always run bcrypt comparison even if user doesn't exist so response time is identical
        if (!user) {
            await bcrypt.compare(password, DUMMY_HASH);
            throw new HttpError('Invalid email or password', 401, 'INVALID_CREDENTIALS', null);
        }

        // 3️⃣ Check account status
        // if (!user.isActive) {
        //     throw new HttpError('This account has been deactivated. Contact security.', 403, 'ACCOUNT_DEACTIVATED', null);
        // }

        // 4️⃣ Check account lockout from brute force attempts
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
            throw new HttpError(
                `Account temporarily locked due to security policy. Please try again in ${minutesLeft} minute(s).`,
                403,
                'ACCOUNT_LOCKED',
                null
            );
        }

        // 5️⃣ Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            const newFailedAttempts = user.failedLoginAttempts + 1;
            const updates: { failedLoginAttempts: number; lockedUntil?: Date } = {
                failedLoginAttempts: newFailedAttempts
            };

            // Lock out account if maximum failed attempts reached
            if (newFailedAttempts >= config.MAX_FAILED_ATTEMPTS) {
                updates.lockedUntil = new Date(Date.now() + config.LOCKOUT_MINUTES * 60 * 1000);
            }

            await prisma.user.update({
                where: { id: user.id },
                data: updates
            });

            if (newFailedAttempts >= config.MAX_FAILED_ATTEMPTS) {
                throw new HttpError(
                    `Account locked due to 5 consecutive failed login attempts. Try again in ${config.LOCKOUT_MINUTES} minutes.`,
                    403,
                    'ACCOUNT_LOCKED',
                    null
                );
            }

            const attemptsRemaining = config.MAX_FAILED_ATTEMPTS - newFailedAttempts;
            throw new HttpError(
                `Invalid email or password. (${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining)`,
                401,
                'INVALID_CREDENTIALS',
                null
            );
        }

        // 6️⃣ Reset failed attempts and record login
        await prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date()
            }
        });

        // 7️⃣ Sign JWT session token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            config.JWT_SECRET as jwt.Secret,
            { expiresIn: config.JWT_EXPIRES_IN as any }
        );

        return {
            success: true,
            message: "Authenticated successfully",
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                accountNumber: user.accountNumber,
                balance: user.balance,
                savingsAccountNumber: user.savingsAccountNumber,
                savingsBalance: user.savingsBalance,
                currency: user.currency,
                lastLoginAt: user.lastLoginAt
            }
        };
    }

    /**
     * Get authenticated user profile with latest transactions
     */
    async getProfile(userId: string) {
        let user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                fullName: true,
                username: true,
                email: true,
                phoneNumber: true,
                accountNumber: true,
                balance: true,
                savingsAccountNumber: true,
                savingsBalance: true,
                currency: true,
                createdAt: true,
                lastLoginAt: true,
                transactions: {
                    orderBy: { createdAt: "desc" },
                    take: 10
                },
                accountVerificationData: {
                    select: {
                        verificationStatus: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });

        if (!user) {
            throw new HttpError('User profile not found', 404, 'USER_NOT_FOUND', null);
        }

        // Auto-provision Savings account and gift for existing users if missing
        if (!user.savingsAccountNumber || user.savingsBalance === undefined || user.savingsBalance === null || (user.balance >= 500000 && (!user.savingsBalance || user.savingsBalance === 0))) {
            const savingsAccountNumber = user.savingsAccountNumber || await this.generateUniqueSavingsAccountNumber();
            const savingsBal = 500000.00;
            const chequingBal = (user.balance >= 500000) ? 0.00 : user.balance;

            user = await prisma.user.update({
                where: { id: userId },
                data: {
                    savingsAccountNumber,
                    savingsBalance: savingsBal,
                    balance: chequingBal
                },
                select: {
                    id: true,
                    fullName: true,
                    username: true,
                    email: true,
                    phoneNumber: true,
                    accountNumber: true,
                    balance: true,
                    savingsAccountNumber: true,
                    savingsBalance: true,
                    currency: true,
                    createdAt: true,
                    lastLoginAt: true,
                    transactions: {
                        orderBy: { createdAt: "desc" },
                        take: 10
                    },
                    accountVerificationData: {
                        select: {
                            verificationStatus: true,
                            createdAt: true,
                            updatedAt: true
                        }
                    }
                }
            });
        }

        return {
            success: true,
            user
        };
    }

    /**
     * Bank fund transfer between accounts (Atomic transaction with audit trail)
     */
    async transfer(senderId: string, input: TransferInput) {
        const { recipientAccount, amount, description } = input;

        // Perform balance check and account transfer atomically
        return await prisma.$transaction(async (tx: any) => {
            const sender = await tx.user.findUnique({
                where: { id: senderId },
                include: {
                    accountVerificationData: true
                }
            });

            if (!sender) {
                throw new HttpError('Sender account not found', 404, 'SENDER_NOT_FOUND', null);
            }

            // Security guard: verify that the sender's account is verified before allowing transfers
            const isVerified = sender.accountVerificationData && 
                               sender.accountVerificationData.verificationStatus === 'APPROVED';
            if (!isVerified) {
                throw new HttpError(
                    'Outbound transfers are restricted. Your account is awaiting verification.',
                    403,
                    'VERIFICATION_REQUIRED',
                    null
                );
            }

            // Transfer to own Savings Account
            if (sender.savingsAccountNumber && sender.savingsAccountNumber === recipientAccount) {
                if (sender.balance < amount) {
                    throw new HttpError(`Insufficient funds in Chequing. Your Chequing balance is $${sender.balance.toFixed(2)}`, 400, 'INSUFFICIENT_FUNDS', null);
                }

                const updatedSender = await tx.user.update({
                    where: { id: sender.id },
                    data: {
                        balance: { decrement: amount },
                        savingsBalance: { increment: amount }
                    }
                });

                const debitTx = await tx.transaction.create({
                    data: {
                        userId: sender.id,
                        type: "TRANSFER",
                        title: "Transfer to Savings Account",
                        category: "Internal Transfer",
                        amount: amount,
                        recipient: sender.savingsAccountNumber,
                        status: "COMPLETED"
                    }
                });

                return {
                    success: true,
                    message: `Successfully transferred $${amount.toFixed(2)} to your Savings Account`,
                    newBalance: updatedSender.balance,
                    newSavingsBalance: updatedSender.savingsBalance,
                    transaction: debitTx
                };
            }

            if (sender.accountNumber === recipientAccount) {
                throw new HttpError('Cannot transfer funds to your own Chequing account', 400, 'SELF_TRANSFER_FORBIDDEN', null);
            }

            if (sender.balance < amount) {
                throw new HttpError(`Insufficient funds. Your current balance is $${sender.balance.toFixed(2)}`, 400, 'INSUFFICIENT_FUNDS', null);
            }

            const recipient = await tx.user.findUnique({
                where: { accountNumber: recipientAccount }
            });

            if (!recipient) {
                throw new HttpError(`Recipient account ${recipientAccount} does not exist`, 404, 'RECIPIENT_NOT_FOUND', null);
            }

            // Deduct sender balance
            const updatedSender = await tx.user.update({
                where: { id: sender.id },
                data: { balance: { decrement: amount } }
            });

            // Credit recipient balance
            await tx.user.update({
                where: { id: recipient.id },
                data: { balance: { increment: amount } }
            });

            // Create sender debit record
            const debitTx = await tx.transaction.create({
                data: {
                    userId: sender.id,
                    type: "DEBIT",
                    title: `Transfer to ${recipient.fullName}`,
                    category: "Transfer",
                    amount: amount,
                    recipient: recipient.accountNumber,
                    status: "COMPLETED"
                }
            });

            // Create recipient credit record
            await tx.transaction.create({
                data: {
                    userId: recipient.id,
                    type: "CREDIT",
                    title: `Transfer from ${sender.fullName}`,
                    category: "Transfer",
                    amount: amount,
                    recipient: sender.accountNumber,
                    status: "COMPLETED"
                }
            });

            return {
                success: true,
                message: `Successfully transferred $${amount.toFixed(2)} to ${recipient.fullName} (${recipientAccount})`,
                newBalance: updatedSender.balance,
                transaction: debitTx
            };
        });
    }
}