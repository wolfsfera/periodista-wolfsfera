import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import { config } from '../config';
import { ProcessedContent } from '../editor/gemini-processor';

let bot: TelegramBot | null = null;

/**
 * Initialize Telegram bot (lazy singleton)
 */
function getBot(): TelegramBot {
    if (!bot) {
        if (!config.telegramBotToken) {
            throw new Error('TELEGRAM_BOT_TOKEN not configured');
        }
        bot = new TelegramBot(config.telegramBotToken, { polling: false });
    }
    return bot;
}

/**
 * Send a Breaking News message to the configured Telegram channel
 */
export async function sendTelegramMessage(content: ProcessedContent, imagePath?: string): Promise<void> {
    const telegramBot = getBot();
    const channelId = config.telegramChannelId;

    if (!channelId) {
        throw new Error('TELEGRAM_CHANNEL_ID not configured');
    }

    if (!content.telegram) {
        throw new Error('No Telegram content generated');
    }

    console.log(`[Telegram] 📱 Sending to ${channelId}...`);

    try {
        // Send with image if available
        if (imagePath && fs.existsSync(imagePath)) {
            await telegramBot.sendPhoto(channelId, fs.createReadStream(imagePath) as any, {
                caption: content.telegram.message,
                parse_mode: 'HTML',
                reply_markup: content.telegram.buttons,
            });
            console.log('[Telegram] ✅ Sent with image');
        } else {
            // Send text-only with inline buttons
            await telegramBot.sendMessage(channelId, content.telegram.message, {
                parse_mode: 'HTML',
                reply_markup: content.telegram.buttons,
                disable_web_page_preview: false,
            });
            console.log('[Telegram] ✅ Sent text message');
        }
    } catch (error: any) {
        // Handle specific Telegram errors
        if (error.response?.body?.error_code === 429) {
            const retryAfter = error.response.body.parameters?.retry_after || 30;
            console.log(`[Telegram] ⏳ Rate limited. Retry after ${retryAfter}s`);
            await new Promise(r => setTimeout(r, retryAfter * 1000));
            return sendTelegramMessage(content, imagePath); // Retry once
        }
        throw error;
    }
}

/**
 * Send a simple test message to verify the bot works
 */
export async function testTelegramConnection(): Promise<boolean> {
    try {
        const telegramBot = getBot();
        const me = await telegramBot.getMe();
        console.log(`[Telegram] ✅ Bot connected: @${me.username}`);

        // Try to get channel info
        try {
            const chat = await telegramBot.getChat(config.telegramChannelId);
            console.log(`[Telegram] ✅ Channel: ${chat.title || chat.username || config.telegramChannelId}`);
        } catch {
            console.warn(`[Telegram] ⚠️ Could not get channel info for ${config.telegramChannelId}`);
        }

        return true;
    } catch (error) {
        console.error('[Telegram] ❌ Connection test failed:', error);
        return false;
    }
}
