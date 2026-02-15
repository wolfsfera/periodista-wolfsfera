/**
 * Test the Watcher module independently
 * Run with: npm run test:watcher
 */
import { config } from './config';
import { fetchAllBinanceArticles } from './watcher/binance-rss';
import { scrapeArticleBody } from './watcher/binance-scraper';
import { ChangeDetector } from './watcher/change-detector';
import { GeminiProcessor } from './editor/gemini-processor';

async function testWatcher() {
    console.log('🐺 WOLFSFERA ROBOT PERIODISTA — Watcher Test\n');

    // 1. Test Binance fetching
    console.log('1️⃣  Fetching Binance articles...');
    const articles = await fetchAllBinanceArticles();

    if (articles.length === 0) {
        console.log('❌ No articles found. Check network connection.');
        return;
    }

    console.log(`\n📰 Found ${articles.length} articles:\n`);
    articles.slice(0, 5).forEach((a, i) => {
        console.log(`  ${i + 1}. [${a.category}] ${a.title}`);
        console.log(`     URL: ${a.url.slice(0, 80)}...`);
        console.log(`     Date: ${a.date}`);
        console.log(`     Image: ${a.imageUrl ? '✅' : '❌'}`);
        console.log('');
    });

    // 2. Test scraping the first article
    if (articles.length > 0) {
        console.log('2️⃣  Scraping first article body...');
        const scraped = await scrapeArticleBody(articles[0]);
        console.log(`  Body length: ${scraped.fullBody?.length || 0} chars`);
        console.log(`  Image URL: ${scraped.imageUrl || 'none'}`);
        console.log(`  Preview: ${scraped.fullBody?.slice(0, 200) || 'N/A'}...`);
    }

    // 3. Test change detector
    console.log('\n3️⃣  Testing change detector...');
    const detector = new ChangeDetector();
    const newArticles = detector.filterNew(articles);
    console.log(`  ${newArticles.length} new articles (not seen before)`);

    // 4. Test Gemini processing (if API key exists)
    if (config.geminiApiKey && newArticles.length > 0) {
        console.log('\n4️⃣  Testing Gemini AI processing...');
        const editor = new GeminiProcessor();
        const testArticle = newArticles[0];

        // Enrich with scraping
        const enriched = await scrapeArticleBody(testArticle);

        const content = await editor.processArticle(enriched, 'https://www.wolfsfera.com');

        if (content.telegram) {
            console.log('\n📱 TELEGRAM PREVIEW:');
            console.log('─'.repeat(40));
            console.log(content.telegram.message);
            console.log('─'.repeat(40));
        }

        // Don't mark as seen during testing
        console.log('\n⚠️  Test mode: articles NOT marked as seen');
    }

    console.log('\n✅ Watcher test complete!\n');
}

testWatcher().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
