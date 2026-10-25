import { z } from "zod";
import sanitizeHtml from "sanitize-html";

const sanitize = (val: string) =>
    sanitizeHtml(val, {
        allowedTags: [],
        allowedAttributes: {},
    }).trim();

// Signup schema with robust banking-grade validation
export const SignupSchema = z.object({
    fullName: z
        .string()
        .min(3, "Name must be at least 3 characters")
        .max(50, "Name cannot exceed 50 characters")
        .regex(/^[a-zA-Z0-9_ ]+$/, "Name can only contain letters, numbers, underscores, and spaces")
        .transform(sanitize),
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username cannot exceed 30 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
        .transform(sanitize)
        .optional(),
    email: z
        .string()
        .email("Invalid email address")
        .max(100, "Email cannot exceed 100 characters")
        .transform((val) => sanitize(val).toLowerCase()),
    phoneNumber: z
        .string()
        .min(10, "Phone number must be at least 10 digits")
        .max(20, "Phone number cannot exceed 20 characters")
        .regex(/^[+0-9\- ]+$/, "Phone number can only contain digits, spaces, hyphens, and +")
        .transform(sanitize),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .max(128, "Password cannot exceed 128 characters")
});

// Login schema
export const LoginSchema = z.object({
    email: z
        .string()
        .email("Invalid email address")
        .transform((val) => sanitize(val).toLowerCase()),
    password: z
        .string()
        .min(1, "Password is required")
        .max(128, "Password cannot exceed 128 characters"),
});

// Transfer schema for bank dashboard
export const TransferSchema = z.object({
    recipientAccount: z.string().min(5, "Recipient account number is required").transform((val) => sanitize(val).replace(/\s+/g, '')),
    amount: z.number().positive("Amount must be greater than zero").max(1000000, "Transfer limit exceeded"),
    description: z.string().max(100, "Description cannot exceed 100 characters").optional().transform((v) => v ? sanitize(v) : "Direct Transfer"),
});

// Verify email token schema
export const VerifyEmailSchema = z.object({
    token: z.string().min(1, "Token is required"),
});

// Verify login code schema
export const VerifyLoginCodeSchema = z.object({
    email: z.string().email("Invalid email address").transform((val) => sanitize(val).toLowerCase()),
    code: z
        .string()
        .length(6, "Code must be 6 digits")
        .regex(/^\d{6}$/, "Code must be numeric"),
});

// Resend verification schema
export const ResendVerificationSchema = z.object({
    email: z.string().email("Invalid email address").transform((val) => sanitize(val).toLowerCase()),
});

// Format Zod validation errors
export function formatZodValidationError(parsedBody: any) {
    if (!parsedBody || !parsedBody.error || !parsedBody.error.issues) {
        return [];
    }
    const formattedErrors = parsedBody.error.issues.map((e: any) => ({
        field: e.path ? e.path[0] : 'field',
        message: e.message || 'Validation error',
    }));

    return formattedErrors;
}

// Type exports
export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type TransferInput = z.infer<typeof TransferSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type VerifyLoginCodeInput = z.infer<typeof VerifyLoginCodeSchema>;
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;