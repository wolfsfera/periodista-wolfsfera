import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { BinanceArticle } from './binance-rss';

interface SeenData {
    articles: Record<string, { title: string; seenAt: string; publishedAt: string[] }>;
    lastCheck: string;
    totalProcessed: number;
}

/**
 * Manages a persistent record of already-processed articles
 * to avoid duplicate processing and distribution
 */
export class ChangeDetector {
    private seenData: SeenData;
    private filePath: string;

    constructor() {
        this.filePath = config.seenFile;
        this.seenData = this.loadSeen();
    }

    private loadSeen(): SeenData {
        try {
            // Ensure data directory exists
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                return JSON.parse(raw);
            }
        } catch (error) {
            console.warn('[Detector] ⚠️ Could not load seen.json, starting fresh');
        }

        return {
            articles: {},
            lastCheck: new Date().toISOString(),
            totalProcessed: 0,
        };
    }

    private save(): void {
        try {
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.filePath, JSON.stringify(this.seenData, null, 2));
        } catch (error) {
            console.error('[Detector] ❌ Could not save seen.json:', error);
        }
    }

    /**
     * Filter articles to only return NEW ones that haven't been processed
     */
    filterNew(articles: BinanceArticle[]): BinanceArticle[] {
        const newArticles: BinanceArticle[] = [];

        for (const article of articles) {
            // Check by ID and also by title hash to catch duplicates
            const titleKey = this.titleHash(article.title);

            if (!this.seenData.articles[article.id] && !this.seenData.articles[titleKey]) {
                newArticles.push(article);
            }
        }

        console.log(`[Detector] 🔎 ${articles.length} total → ${newArticles.length} new articles`);
        return newArticles;
    }

    /**
     * Mark articles as processed
     */
    markSeen(articles: BinanceArticle[]): void {
        for (const article of articles) {
            const titleKey = this.titleHash(article.title);

            this.seenData.articles[article.id] = {
                title: article.title,
                seenAt: new Date().toISOString(),
                publishedAt: [],
            };

            // Also store by title hash for cross-source dedup
            this.seenData.articles[titleKey] = {
                title: article.title,
                seenAt: new Date().toISOString(),
                publishedAt: [],
            };

            this.seenData.totalProcessed++;
        }

        this.seenData.lastCheck = new Date().toISOString();
        this.save();
    }

    /**
     * Record that an article was published to a specific platform
     */
    recordPublication(articleId: string, platform: string): void {
        if (this.seenData.articles[articleId]) {
            this.seenData.articles[articleId].publishedAt.push(
                `${platform}:${new Date().toISOString()}`
            );
            this.save();
        }
    }

    /**
     * Get stats about processed articles
     */
    getStats() {
        return {
            totalSeen: Object.keys(this.seenData.articles).length,
            totalProcessed: this.seenData.totalProcessed,
            lastCheck: this.seenData.lastCheck,
        };
    }

    private titleHash(title: string): string {
        const clean = title.toLowerCase().replace(/[^a-z0-9]/g, '');
        return `title-${clean.slice(0, 40)}`;
    }
}
