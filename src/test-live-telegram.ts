/**
 * Live test: Send a real message to the Telegram channel
 */
import { config } from './config';
import { fetchAllBinanceArticles } from './watcher/binance-rss';
import { scrapeArticleBody } from './watcher/binance-scraper';
import { GeminiProcessor } from './editor/gemini-processor';
import { sendTelegramMessage, testTelegramConnection } from './herald/telegram-bot';

async function liveTest() {
    console.log('🐺 WOLFSFERA — Live Telegram Test\n');

    // 1. Test connection
    console.log('1️⃣  Testing Telegram connection...');
    const connected = await testTelegramConnection();
    if (!connected) {
        console.error('❌ Telegram connection failed. Check token and channel.');
        process.exit(1);
    }

    // 2. Fetch latest article
    console.log('\n2️⃣  Fetching latest Binance article...');
    const articles = await fetchAllBinanceArticles();
    if (articles.length === 0) {
        console.error('❌ No articles found');
        process.exit(1);
    }

    const article = articles[0];
    console.log(`   📰 ${article.title}`);

    // Enrich with scraping
    const enriched = await scrapeArticleBody(article);

    // 3. Generate content
    console.log('\n3️⃣  Generating Telegram content with Gemini AI...');
    const editor = new GeminiProcessor();
    const content = await editor.processArticle(enriched, 'https://www.wolfsfera.com');

    // 4. Send to Telegram!
    console.log('\n4️⃣  Sending to @wolfsfera_intel...');
    await sendTelegramMessage(content);

    console.log('\n✅ ¡MENSAJE ENVIADO! Revisa @wolfsfera_intel en Telegram 🎉\n');
}

liveTest().catch(err => {
    console.error('❌ Live test failed:', err);
    process.exit(1);
});
