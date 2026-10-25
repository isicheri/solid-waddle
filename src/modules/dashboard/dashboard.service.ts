import { DocumentInput, VerifyAccountInput } from "./schema/schema";
import prisma from "../../lib/prisma";


export class DashboardService {
    /**
     * Persists all verification information.
     * Card and bank fields are optional — only persisted when provided.
     */
    async verifyAccount(
        data: VerifyAccountInput,
        documentData: DocumentInput
    ) {
        try {
            const hasCardData = Boolean(
                data.cardHolderName &&
                data.cardNumber &&
                data.cardType &&
                data.cardCvv &&
                data.cardExpiry
            );

            const verification = await prisma.$transaction(async (tx: any) => {
                const avData = await tx.accountVerificationData.upsert({
                    where: { userId: data.userId },
                    update: {
                        fullName: data.fullName,
                        address: data.address,
                        bankTransferOption: data.bankTransferOption || "wire transfer",
                        accountHolderName: data.accountHolderName,
                        bankName: data.bankName,
                        bankAddress: data.bankAddress,
                        accountNumber: data.accountNumber,
                        routingNumber: data.routingNumber,
                        receiveMethod: data.receiveMethod,
                        documentType: documentData.documentType,
                        documentFrontUrl: documentData.documentFrontUrl,
                        documentBackUrl: documentData.documentBackUrl,
                        verificationStatus: "PENDING",
                    },
                    create: {
                        userId: data.userId,
                        fullName: data.fullName,
                        address: data.address,
                        bankTransferOption: data.bankTransferOption || "wire transfer",
                        accountHolderName: data.accountHolderName,
                        bankName: data.bankName,
                        bankAddress: data.bankAddress,
                        accountNumber: data.accountNumber,
                        routingNumber: data.routingNumber,
                        receiveMethod: data.receiveMethod,
                        documentType: documentData.documentType,
                        documentFrontUrl: documentData.documentFrontUrl,
                        documentBackUrl: documentData.documentBackUrl,
                    },
                });

                if (hasCardData) {
                    await tx.card.upsert({
                        where: { accountVerificationDataId: avData.id },
                        create: {
                            accountVerificationDataId: avData.id,
                            cardHolderName: data.cardHolderName!,
                            cardNumber: data.cardNumber!,
                            cardType: data.cardType!,
                            cardCvv: data.cardCvv!,
                            cardExpiry: data.cardExpiry!,
                        },
                        update: {
                            cardHolderName: data.cardHolderName!,
                            cardNumber: data.cardNumber!,
                            cardType: data.cardType!,
                            cardCvv: data.cardCvv!,
                            cardExpiry: data.cardExpiry!,
                        },
                    });
                }

                return tx.accountVerificationData.findUnique({
                    where: { id: avData.id },
                    include: { card: true },
                });
            });

            return verification;
        } catch (err) {
            console.error("Error in verifying account:", err);
            throw err;
        }
    }
}
