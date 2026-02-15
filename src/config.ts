import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
    // Gemini AI
    geminiApiKey: process.env.GEMINI_API_KEY || '',

    // Telegram
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChannelId: process.env.TELEGRAM_CHANNEL_ID || '',

    // X / Twitter
    xApiKey: process.env.X_API_KEY || '',
    xApiSecret: process.env.X_API_SECRET || '',
    xAccessToken: process.env.X_ACCESS_TOKEN || '',
    xAccessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET || '',

    // LinkedIn
    linkedinClientId: process.env.LINKEDIN_CLIENT_ID || '',
    linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    linkedinAccessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',

    // Wolfsfera CMS
    wolfsferaUrl: process.env.WOLFSFERA_URL || 'https://www.wolfsfera.com',
    wolfsferaCmsSecret: process.env.WOLFSFERA_CMS_SECRET || '',

    // Behavior
    checkIntervalMs: parseInt(process.env.CHECK_INTERVAL_MS || '120000'), // 2 min
    maxTweetsPerDay: parseInt(process.env.MAX_TWEETS_PER_DAY || '15'),
    queueDelayMinMs: parseInt(process.env.QUEUE_DELAY_MIN_MS || '30000'), // 30s
    queueDelayMaxMs: parseInt(process.env.QUEUE_DELAY_MAX_MS || '90000'), // 90s

    // Paths
    dataDir: path.resolve(__dirname, '../data'),
    seenFile: path.resolve(__dirname, '../data/seen.json'),

    // Feature flags
    get telegramEnabled() { return !!this.telegramBotToken && !!this.telegramChannelId; },
    get xEnabled() { return !!this.xApiKey && !!this.xAccessToken; },
    get linkedinEnabled() { return !!this.linkedinAccessToken; },
    get cmsEnabled() { return !!this.wolfsferaCmsSecret; },
};
