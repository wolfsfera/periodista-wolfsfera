/**
 * Live test: Send a real tweet to X
 * Forces a "Major Listing" article to ensure score >= 7
 */
import { config } from './config';
import { scoreRelevance } from './editor/relevance-filter';
import { GeminiProcessor } from './editor/gemini-processor';
import { postTwitterThread, testTwitterConnection } from './herald/twitter-client';
import { BinanceArticle } from './watcher/binance-rss';

async function liveTestX() {
    console.log('🐺 WOLFSFERA — Live X/Twitter Test\n');

    // 1. Skip connection test (Free Tier doesn't allow v2.me())
    console.log('1️⃣  Skipping connection test (Free Tier restriction)...');

    // 2. Create a fake "Major Listing" article to force score 10/10
    const fakeArticle: BinanceArticle = {
        id: 'test-article-12345',
        title: 'Binance Will List Wolfsfera (WOLF) with Seed Tag Applied',
        url: 'https://www.binance.com/en/support/announcement/test-article-12345',
        date: new Date().toISOString(),
        category: 'listing',
        summary: 'Binance is excited to announce the listing of Wolfsfera (WOLF). Trading pairs: WOLF/USDT, WOLF/BTC.',
    };

    console.log(`\n2️⃣  Simulating article: "${fakeArticle.title}"`);

    // 3. Score it
    console.log('\n3️⃣  Scoring relevance...');
    const relevance = await scoreRelevance(fakeArticle);

    if (!relevance.publishToX) {
        console.error(`❌ Score ${relevance.score}/10 is too low for X. Test aborted.`);
        process.exit(1);
    }
    console.log(`✅ Score ${relevance.score}/10 — High enough for X!`);

    // 4. Generate content
    console.log('\n4️⃣  Generating X thread with Gemini AI...');
    const editor = new GeminiProcessor();
    const content = await editor.processArticle(fakeArticle, 'https://www.wolfsfera.com');

    // 5. Post to X!
    console.log('\n5️⃣  Posting to @wolfsfera...');
    await postTwitterThread(content);

    console.log('\n✅ ¡TWEET ENVIADO! Revisa @wolfsfera en X 🎉\n');
}

liveTestX().catch(err => {
    console.error('❌ Live test failed:', err);
    process.exit(1);
});
