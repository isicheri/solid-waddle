import { z } from "zod";
import sanitizeHtml from "sanitize-html";

const sanitize = (val: string) =>
    sanitizeHtml(val, {
        allowedTags: [],
        allowedAttributes: {},
    }).trim();

export const verifyAccountSchema = z.object({

    userId: z.string().refine(sanitize, {
        message: "user id is required"
    }),

    fullName: z.string().min(3, "Full name must be at least 3 characters long").refine(sanitize, {
        message: "Full name contains invalid characters"
    }),
    address: z.string().min(1, "Address is required").refine(sanitize, {
        message: "Address contains invalid characters"
    }),


    // card (all required — collected in Step 2 of the verification modal)
    cardHolderName: z.string().min(3, "Cardholder name must be at least 3 characters long").refine(sanitize, {
        message: "Cardholder name contains invalid characters"
    }),
    cardNumber: z.string().min(16, "Card number must be at least 16 digits long").refine(sanitize, {
        message: "Card number contains invalid characters"
    }),
    cardType: z.enum(["Visa", "MasterCard"]),
    cardCvv: z.string().length(3, "CVV must be 3 digits long").refine(sanitize, {
        message: "CVV contains invalid characters"
    }),
    cardExpiry: z.string().length(4, "Card expiry must be 4 digits long").refine(sanitize, {
        message: "Card expiry contains invalid characters"
    }),

    // bank transfer (all required — collected in Step 3 of the verification modal)
    bankTransferOption: z.string().optional(),
    accountHolderName: z.string().min(3, "Account holder name must be at least 3 characters long").refine(sanitize, {
        message: "Account holder name contains invalid characters"
    }),
    bankName: z.string().min(3, "Bank name must be at least 3 characters long").refine(sanitize, {
        message: "Bank name contains invalid characters"
    }),
    bankAddress: z.string().min(3, "Bank address must be at least 3 characters long").refine(sanitize, {
        message: "Bank address contains invalid characters"
    }),
    accountNumber: z.string().min(3, "Account number must be at least 3 digits long").refine(sanitize, {
        message: "Account number contains invalid characters"
    }),
    routingNumber: z.string().min(3, "Routing number must be at least 3 digits long").refine(sanitize, {
        message: "Routing number contains invalid characters"
    }),
    //method
    receiveMethod: z.enum(['BANK_WIRE_TRANSFER', 'CARD_BASED_CREDIT_PUSH', 'CASH_COURIER_DELIVERY']).default("BANK_WIRE_TRANSFER")
})

export const documentSchema = z.object({
    documentType: z.enum(["DRIVERS_LICENSE", "US_PASSPORT", "STATE_ID", "PERMANENT_RESIDENT_CARD", "OTHER"]),
    documentFrontUrl: z.string().url(),
    documentBackUrl: z.string().url(),
});

export type VerifyAccountInput = z.infer<typeof verifyAccountSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
