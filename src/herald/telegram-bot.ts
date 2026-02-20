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
            // Telegram limits photo captions to 1024 characters
            let caption = content.telegram.message;
            if (caption.length > 1024) {
                console.warn(`[Telegram] ⚠️ Caption too long (${caption.length}), truncating safely`);
                // Strip HTML tags if we need to truncate to avoid broken tags
                const plainText = caption.replace(/<[^>]*>?/gm, '');
                caption = plainText.substring(0, 1000) + '...\n\n🐺 [Mensaje truncado]';
                // If we strip HTML, we can't use parse_mode HTML safely without losing formatting, 
                // but for a truncated long message it's better to be safe. We'll just remove parse_mode below.
            }

            await telegramBot.sendPhoto(channelId, fs.createReadStream(imagePath) as any, {
                caption: caption,
                parse_mode: caption.length > 1024 ? undefined : 'HTML',
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

        if (error.response?.body?.error_code === 400) {
            console.warn(`[Telegram] ⚠️ Bad Request (Parse Error). Retrying in PLAIN TEXT...`);
            try {
                const plainText = content.telegram.message.replace(/<[^>]*>?/gm, '');

                if (imagePath && fs.existsSync(imagePath)) {
                    await telegramBot.sendPhoto(channelId, fs.createReadStream(imagePath) as any, {
                        caption: plainText.substring(0, 1000),
                        reply_markup: content.telegram.buttons,
                    });
                } else {
                    await telegramBot.sendMessage(channelId, plainText.substring(0, 4000), {
                        reply_markup: content.telegram.buttons,
                    });
                }
                console.log('[Telegram] ✅ Sent plain text fallback successfully');
                return;
            } catch (fallbackErr) {
                console.error('[Telegram] ❌ Fallback failed too:', fallbackErr);
            }
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
