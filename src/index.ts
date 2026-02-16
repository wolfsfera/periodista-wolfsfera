console.log(' [BOOT] Starting... ENV Check:');
console.log(' [BOOT] TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✅ (Present)' : '❌ (MISSING)');
console.log(' [BOOT] GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ (Present)' : '❌ (MISSING)');
console.log(' [BOOT] WOLFSFERA_CMS_SECRET:', process.env.WOLFSFERA_CMS_SECRET ? '✅ (Present)' : '❌ (MISSING)');

import { config } from './config';
import { fetchAllBinanceArticles, BinanceArticle } from './watcher/binance-rss';
import { scrapeArticleBody } from './watcher/binance-scraper';
import { ChangeDetector } from './watcher/change-detector';
import { EmailTrigger } from './watcher/email-trigger';
import { GeminiProcessor } from './editor/gemini-processor';
import { scoreRelevance } from './editor/relevance-filter';
import { ImageProcessor } from './visualizer/image-processor';
import { PublicationQueue } from './herald/queue';
import { sendTelegramMessage, testTelegramConnection } from './herald/telegram-bot';
import { postTwitterThread, testTwitterConnection } from './herald/twitter-client';
import { postLinkedIn, testLinkedInConnection } from './herald/linkedin-client';
import { createCmsStub } from './cms/create-stub';

import http from 'http';

/**
 * 🤖 WOLFSFERA ROBOT PERIODISTA
 * 
 * Autonomous content system that:
 * 1. Monitors Binance for new announcements (The Watcher)
 * 2. Processes them with Gemini AI (The Editor)
 * 3. Creates optimized visuals (The Visualizer)
 * 4. Distributes to X, Telegram, LinkedIn (The Herald)
 * 5. Creates stub articles on wolfsfera.com (CMS)
 */

// DUMMY SERVER FOR RAILWAY/RENDER (Keep Alive)
const port = process.env.PORT || 8080;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Wolfsfera Robot is Active 🐺');
}).listen(port, () => {
    console.log(`[BOOT] 👂 Health check server listening on port ${port}`);
});

class RobotPeriodista {
    private detector: ChangeDetector;
    private editor: GeminiProcessor;
    private visualizer: ImageProcessor;
    private queue: PublicationQueue;
    private emailTrigger: EmailTrigger; // Added
    private running = false;
    private cycleCount = 0;

    constructor() {
        this.detector = new ChangeDetector();
        this.editor = new GeminiProcessor();
        this.visualizer = new ImageProcessor();
        this.queue = new PublicationQueue();
        this.emailTrigger = new EmailTrigger(); // Added
    }

    /**
     * Start the robot in continuous monitoring mode
     */
    async start(): Promise<void> {
        console.log('\n' + '='.repeat(60));
        console.log('🐺 WOLFSFERA ROBOT PERIODISTA v1.0');
        console.log('='.repeat(60));
        console.log(`⏰ Check interval: ${config.checkIntervalMs / 1000}s`);
        console.log(`📊 Max tweets/day: ${config.maxTweetsPerDay}`);

        // Show enabled platforms
        console.log('\n📡 Platforms:');
        console.log(`   Telegram: ${config.telegramEnabled ? '✅ ACTIVE' : '❌ Not configured'}`);
        console.log(`   X/Twitter: ${config.xEnabled ? '✅ ACTIVE' : '⏸️  Waiting for API keys'}`);
        console.log(`   LinkedIn: ${config.linkedinEnabled ? '✅ ACTIVE' : '⏸️  Waiting for API keys'}`);
        console.log(`   CMS Stubs: ${config.cmsEnabled ? '✅ ACTIVE' : '⏸️  Waiting for secret'}`);
        console.log(`   Email Trigger: ${config.emailEnabled ? '✅ ACTIVE' : '❌ Not configured'}`); // Added email log

        // Test connections
        await this.testConnections();

        // Start monitoring loop
        this.running = true;
        console.log('\n🚀 Robot started! Monitoring Binance...\n');

        while (this.running) {
            try {
                await this.runCycle();
            } catch (error) {
                console.error('[Robot] ❌ Cycle error:', error);
            }

            // Wait before next check
            console.log(`[Robot] 💤 Sleeping ${config.checkIntervalMs / 1000}s until next check...`);
            await sleep(config.checkIntervalMs);
        }
    }

    /**
     * Run a single check-process-distribute cycle
     */
    async runCycle(): Promise<void> {
        this.cycleCount++;
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`[Robot] 🔄 Cycle #${this.cycleCount} @ ${new Date().toLocaleTimeString()}`);

        const allArticles: BinanceArticle[] = [];

        // 1. FETCH articles from Binance
        try {
            const binanceArticles = await fetchAllBinanceArticles();
            allArticles.push(...binanceArticles);
        } catch (e) {
            console.error('[Robot] ⚠️ Binance check failed:', e);
        }

        // 2. Check Email (User Content - "La Bomba")
        if (config.emailEnabled) {
            try {
                const emailArticles = await this.emailTrigger.checkEmails();
                if (emailArticles.length > 0) {
                    console.log(`[Robot] 💣 Found ${emailArticles.length} USER articles via Email!`);
                    allArticles.push(...emailArticles);
                }
            } catch (e) {
                console.error('[Robot] ⚠️ Email check failed:', e);
            }
        }

        // 3. FILTER to only new articles
        const newArticles = this.detector.filterNew(allArticles);
        if (newArticles.length === 0) {
            console.log('[Robot] 📭 No new articles');
            return;
        }

        console.log(`[Robot] 🆕 ${newArticles.length} new article(s) found!`);

        // 4. PROCESS each new article
        for (const article of newArticles) {
            await this.processArticle(article);
        }

        // 4. EXECUTE the publication queue
        await this.queue.process();

        // 5. MARK articles as seen
        this.detector.markSeen(newArticles);

        // 6. CLEANUP old images
        this.visualizer.cleanup();

        // Stats
        const stats = this.detector.getStats();
        console.log(`[Robot] 📊 Total processed: ${stats.totalProcessed} | Queue: ${this.queue.getStats().dailyCount}/${config.maxTweetsPerDay}`);
    }

    /**
     * Process a single article through all modules
     */
    private async processArticle(article: BinanceArticle): Promise<void> {
        console.log(`\n[Robot] 📰 Processing: ${article.title}`);

        // Scrape full body if not already available
        if (!article.fullBody) {
            const enriched = await scrapeArticleBody(article);
            article.fullBody = enriched.fullBody;
            article.imageUrl = enriched.imageUrl || article.imageUrl;
        }

        // Score relevance to decide which platforms get this article
        const relevance = await scoreRelevance(article);

        // Create CMS stub
        const stubUrl = await createCmsStub(article);

        // Generate AI content for all platforms
        const content = await this.editor.processArticle(article, stubUrl);

        // Process image
        const images = await this.visualizer.processImage(
            article.imageUrl || '',
            article.id.replace(/[^a-z0-9]/gi, '_').slice(0, 30)
        );

        // Queue publications — Telegram gets EVERYTHING
        if (content.telegram && config.telegramEnabled) {
            this.queue.enqueue('telegram', () =>
                sendTelegramMessage(content, images.telegram)
            );
        }

        // X only gets important news (score >= 7)
        if (content.twitter && config.xEnabled && relevance.publishToX) {
            this.queue.enqueue('twitter', () =>
                postTwitterThread(content, images.twitter)
            );
        } else if (config.xEnabled && !relevance.publishToX) {
            console.log(`[Robot] ⏭️  X skipped (score ${relevance.score}/10): ${relevance.reason}`);
        }

        // LinkedIn only gets major strategic news (score >= 8)
        if (content.linkedin && config.linkedinEnabled && relevance.publishToLinkedin) {
            this.queue.enqueue('linkedin', () =>
                postLinkedIn(content, images.linkedin)
            );
        } else if (config.linkedinEnabled && !relevance.publishToLinkedin) {
            console.log(`[Robot] ⏭️  LinkedIn skipped (score ${relevance.score}/10)`);
        }
    }

    /**
     * Test all configured platform connections
     */
    private async testConnections(): Promise<void> {
        console.log('\n🔌 Testing connections...');

        if (config.telegramEnabled) {
            await testTelegramConnection();
        }
        if (config.xEnabled) {
            await testTwitterConnection();
        }
        if (config.linkedinEnabled) {
            await testLinkedInConnection();
        }
    }

    /**
     * Stop the robot gracefully
     */
    stop(): void {
        console.log('[Robot] 🛑 Stopping...');
        this.running = false;
    }

    /**
     * Run ONE cycle only (for testing)
     */
    async runOnce(): Promise<void> {
        console.log('\n🐺 WOLFSFERA ROBOT PERIODISTA — Single Run Mode\n');
        await this.testConnections();
        await this.runCycle();
        console.log('\n✅ Single run complete.\n');
    }
}

// ─── ENTRY POINT ───────────────────────────────────────────

const mode = process.argv[2] || 'monitor';
const robot = new RobotPeriodista();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT. Shutting down...');
    robot.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    robot.stop();
    process.exit(0);
});

// Start based on mode
if (mode === 'once') {
    // Single test run
    robot.runOnce().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
} else {
    // Continuous monitoring
    robot.start().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
