import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { BinanceArticle } from '../watcher/binance-rss';
import { buildTwitterThreadPrompt } from './prompts/twitter-thread';
import { buildTelegramPrompt, buildTelegramButtons } from './prompts/telegram-breaking';
import { buildLinkedInPrompt } from './prompts/linkedin-analysis';
import { buildWebArticlePrompt } from './prompts/web-article';

export interface ProcessedContent {
    article: BinanceArticle;
    stubUrl: string;
    twitter?: {
        thread: string[];
    };
    telegram?: {
        message: string;
        buttons: ReturnType<typeof buildTelegramButtons>;
    };
    linkedin?: {
        post: string;
    };
    webArticle?: {
        html: string;
    };
}

/**
 * The Editor — processes articles through Gemini AI to create
 * platform-optimized content for distribution
 */
export class GeminiProcessor {
    private genAI: GoogleGenerativeAI;
    private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

    constructor() {
        if (!config.geminiApiKey) {
            throw new Error('GEMINI_API_KEY is required');
        }
        this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }

    /**
     * Process an article and generate content for all enabled platforms
     */
    async processArticle(article: BinanceArticle, stubUrl: string): Promise<ProcessedContent> {
        console.log(`[Editor] 🧠 Processing: ${article.title.slice(0, 60)}...`);

        const result: ProcessedContent = { article, stubUrl };

        // Generate content for each enabled platform in parallel
        const tasks: Promise<void>[] = [];

        if (config.telegramEnabled) {
            tasks.push(this.generateTelegram(article, stubUrl).then(t => { result.telegram = t; }));
        }

        if (config.xEnabled) {
            tasks.push(this.generateTwitterThread(article, stubUrl).then(t => { result.twitter = t; }));
        }

        if (config.linkedinEnabled) {
            tasks.push(this.generateLinkedIn(article, stubUrl).then(l => { result.linkedin = l; }));
        }

        // Always generate Web Article if CMS is enabled (or just always for future use)
        if (config.cmsEnabled) {
            tasks.push(this.generateWebArticle(article).then(w => { result.webArticle = w; }));
        }

        // If no platforms enabled, still generate Telegram content for preview
        if (tasks.length === 0) {
            console.log('[Editor] ⚠️ No platforms enabled, generating Telegram preview');
            tasks.push(this.generateTelegram(article, stubUrl).then(t => { result.telegram = t; }));
        }

        await Promise.all(tasks);

        console.log(`[Editor] ✅ Content generated for ${Object.keys(result).filter(k => !['article', 'stubUrl'].includes(k)).join(', ')}`);
        return result;
    }

    /**
     * Generate Twitter/X thread
     */
    private async generateTwitterThread(article: BinanceArticle, stubUrl: string) {
        try {
            const prompt = buildTwitterThreadPrompt(article, stubUrl);
            const response = await this.model.generateContent(prompt);
            const text = response.response.text();

            // Parse JSON array of tweets
            const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const thread: string[] = JSON.parse(cleanText);

            // Validate tweet lengths
            const validThread = thread
                .filter(t => typeof t === 'string' && t.length > 0)
                .map(t => t.length > 280 ? t.slice(0, 277) + '...' : t);

            console.log(`[Editor] 🐦 Twitter thread: ${validThread.length} tweets`);
            return { thread: validThread };
        } catch (error) {
            console.error('[Editor] ❌ Twitter generation error:', error);
            return { thread: [`🚨 ${article.title}\n\nMás info 👉 ${stubUrl}\n\n#Binance #Crypto`] };
        }
    }

    /**
     * Generate Telegram Breaking News message
     */
    private async generateTelegram(article: BinanceArticle, stubUrl: string) {
        try {
            const prompt = buildTelegramPrompt(article, stubUrl);
            const response = await this.model.generateContent(prompt);
            let message = response.response.text();

            // Clean any markdown artifacts
            message = message.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

            const buttons = buildTelegramButtons(stubUrl, article.url);

            console.log(`[Editor] 📱 Telegram message: ${message.length} chars`);
            return { message, buttons };
        } catch (error) {
            console.error('[Editor] ❌ Telegram generation error:', error);
            const fallbackMessage = `🚨 <b>BREAKING</b>\n\n<b>${article.title}</b>\n\n${article.summary.slice(0, 200)}\n\n🐺 Wolfsfera Intelligence`;
            return {
                message: fallbackMessage,
                buttons: buildTelegramButtons(stubUrl, article.url),
            };
        }
    }

    /**
     * Generate LinkedIn professional post
     */
    private async generateLinkedIn(article: BinanceArticle, stubUrl: string) {
        try {
            const prompt = buildLinkedInPrompt(article, stubUrl);
            const response = await this.model.generateContent(prompt);
            let post = response.response.text();

            // Clean any markdown artifacts
            post = post.replace(/```\n?/g, '').trim();

            console.log(`[Editor] 💼 LinkedIn post: ${post.length} chars`);
            return { post };
        } catch (error) {
            console.error('[Editor] ❌ LinkedIn generation error:', error);
            return { post: `${article.title}\n\n${article.summary}\n\nAnálisis completo: ${stubUrl}\n\n#Blockchain #Crypto` };
        }
    }

    /**
     * Generate Full Web Article (HTML)
     */
    private async generateWebArticle(article: BinanceArticle) {
        try {
            const prompt = buildWebArticlePrompt(article);
            const response = await this.model.generateContent(prompt);
            let html = response.response.text();

            // Clean markdown code blocks if any
            html = html.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

            console.log(`[Editor] 🌐 Web Article: ${html.length} chars`);
            return { html };
        } catch (error) {
            console.error('[Editor] ❌ Web Article generation error:', error);
            return { html: `<p>${article.summary}</p><p>Fuente: <a href="${article.url}">Binance</a></p>` };
        }
    }
}
