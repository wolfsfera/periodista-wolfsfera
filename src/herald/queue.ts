import { ProcessedContent } from '../editor/gemini-processor';
import { config } from '../config';

interface QueueItem {
    platform: string;
    execute: () => Promise<void>;
    delay: number;
}

/**
 * Publication queue with random delays between posts
 * Prevents all platforms from publishing at the same time (anti-spam)
 */
export class PublicationQueue {
    private queue: QueueItem[] = [];
    private processing = false;
    private dailyCount = 0;
    private lastResetDay = new Date().getDate();

    /**
     * Add content to the publication queue
     */
    enqueue(platform: string, execute: () => Promise<void>): void {
        const delay = this.calculateDelay(platform);
        this.queue.push({ platform, execute, delay });
        console.log(`[Queue] 📋 Added ${platform} to queue (delay: ${Math.round(delay / 1000)}s)`);
    }

    /**
     * Process the queue sequentially with delays
     */
    async process(): Promise<void> {
        if (this.processing) {
            console.log('[Queue] ⚠️ Already processing, skipping');
            return;
        }

        this.processing = true;
        this.checkDailyReset();

        console.log(`[Queue] 🚀 Processing ${this.queue.length} items...`);

        while (this.queue.length > 0) {
            const item = this.queue.shift()!;

            // Check daily limit
            if (this.dailyCount >= config.maxTweetsPerDay) {
                console.log(`[Queue] 🛑 Daily limit reached (${config.maxTweetsPerDay}). Skipping ${item.platform}`);
                continue;
            }

            // Wait the specified delay
            if (item.delay > 0) {
                console.log(`[Queue] ⏳ Waiting ${Math.round(item.delay / 1000)}s before ${item.platform}...`);
                await sleep(item.delay);
            }

            try {
                await item.execute();
                this.dailyCount++;
                console.log(`[Queue] ✅ ${item.platform} published (${this.dailyCount}/${config.maxTweetsPerDay} today)`);
            } catch (error) {
                console.error(`[Queue] ❌ ${item.platform} failed:`, error);
            }
        }

        this.processing = false;
        console.log('[Queue] ✅ Queue empty');
    }

    /**
     * Calculate delay for a platform
     * Telegram = instant, X = 30-90s, LinkedIn = 3-5min
     */
    private calculateDelay(platform: string): number {
        switch (platform) {
            case 'telegram':
                return 0; // Instant
            case 'twitter':
                return randomBetween(config.queueDelayMinMs, config.queueDelayMaxMs);
            case 'linkedin':
                return randomBetween(180000, 300000); // 3-5 minutes
            default:
                return randomBetween(10000, 30000);
        }
    }

    /**
     * Reset daily counter at midnight
     */
    private checkDailyReset(): void {
        const today = new Date().getDate();
        if (today !== this.lastResetDay) {
            this.dailyCount = 0;
            this.lastResetDay = today;
            console.log('[Queue] 🔄 Daily counter reset');
        }
    }

    getStats() {
        return {
            queueLength: this.queue.length,
            processing: this.processing,
            dailyCount: this.dailyCount,
            maxDaily: config.maxTweetsPerDay,
        };
    }
}

function randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
