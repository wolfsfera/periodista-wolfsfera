import { config } from '../config';
import TelegramBot from 'node-telegram-bot-api';

async function checkTelegram() {
    console.log('🔍 Testing Telegram Connection...');
    console.log(`Token: ${config.telegramBotToken ? '✅ Present' : '❌ Missing'}`);
    console.log(`Channel: ${config.telegramChannelId}`);

    if (!config.telegramBotToken || !config.telegramChannelId) {
        console.error('❌ Missing credentials in .env');
        process.exit(1);
    }

    const bot = new TelegramBot(config.telegramBotToken, { polling: false });

    try {
        const me = await bot.getMe();
        console.log(`✅ Bot Authenticated: @${me.username}`);

        console.log(`📨 Sending test message to ${config.telegramChannelId}...`);
        await bot.sendMessage(config.telegramChannelId, `🐺 **Wolfsfera Robot Test**\n\nSi lees esto, la conexión funciona correctamente.\nFecha: ${new Date().toLocaleString()}`, { parse_mode: 'Markdown' });

        console.log('✅ Message sent successfully!');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.response?.body) {
            console.error('Details:', JSON.stringify(error.response.body, null, 2));
        }
        console.log('\n💡 Tip: Make sure the bot is an ADMIN in the channel.');
    }
}

checkTelegram();
