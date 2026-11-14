import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import prisma, { ensureDatabaseSchema } from "../../lib/prisma";
import config from "../../config";

export const AdminController = {
    // Validate Admin Key via header, query param, or body
    checkAuth: (req: Request, res: Response, next: NextFunction) => {
        const providedKey = req.query.key || req.headers["x-admin-key"] || req.body?.key;
        if (providedKey && providedKey === config.ADMIN_KEY) {
            return next();
        }
        res.status(401).json({ success: false, error: "Unauthorized. Invalid Admin Security Key." });
    },

    // List all verification submissions
    getAllVerifications: async (req: Request, res: Response) => {
        try {
            // Guarantee SQLite schema has all columns
            await ensureDatabaseSchema();

            const verifications = await prisma.accountVerificationData.findMany({
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            phoneNumber: true,
                            accountNumber: true,
                            balance: true,
                            savingsAccountNumber: true,
                            savingsBalance: true,
                            role: true,
                            createdAt: true
                        }
                    },
                    card: true
                },
                orderBy: {
                    createdAt: "desc"
                }
            });

            res.json({
                success: true,
                count: verifications.length,
                data: verifications
            });
        } catch (err: any) {
            console.error("[Admin Submissions Error]:", err);
            res.status(500).json({ success: false, error: err.message || "Database synchronization in progress. Please refresh." });
        }
    },

    // Update Verification Status (e.g. APPROVED or REJECTED)
    updateStatus: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
                return res.status(400).json({ success: false, error: "Invalid status value" });
            }

            const updated = await prisma.accountVerificationData.update({
                where: { id },
                data: { verificationStatus: status },
                include: { user: true }
            });

            console.log(`[LAFP Admin] Verification status for ${updated.fullName} (${updated.user.email}) changed to ${status}`);

            res.json({
                success: true,
                message: `Verification status updated to ${status}`,
                verification: updated
            });
        } catch (err: any) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Securely stream document image to authenticated admin
    serveDocument: (req: Request, res: Response) => {
        const filename = String(req.params.filename || '');
        if (!filename) {
            return res.status(400).json({ success: false, error: "Filename is required" });
        }
        // Basic path traversal prevention
        const safeFilename = path.basename(filename);
        const filePath = path.join(process.cwd(), "uploads", "identity-docs", safeFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: "Document file not found on disk" });
        }

        res.sendFile(filePath);
    }
};
