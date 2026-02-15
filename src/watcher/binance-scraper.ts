import * as cheerio from 'cheerio';
import { BinanceArticle } from './binance-rss';

/**
 * Scrape full article body and images from a Binance article URL
 * Used as a secondary step when we need the complete content for AI processing
 */
export async function scrapeArticleBody(article: BinanceArticle): Promise<BinanceArticle> {
    try {
        console.log(`[Scraper] 🔍 Scraping: ${article.title.slice(0, 60)}...`);

        // Random delay to avoid detection (1-3 seconds)
        await sleep(1000 + Math.random() * 2000);

        const response = await fetch(article.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
            },
        });

        if (!response.ok) {
            console.warn(`[Scraper] ⚠️ HTTP ${response.status} for ${article.url}`);
            return article;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract main article body
        // Binance uses various selectors depending on the page type
        const bodySelectors = [
            '#support_article .css-1yxx6id',
            '.richtext-paragraph',
            'article',
            '.css-1ap5wc6',
            '.rich-editor-content',
        ];

        let body = '';
        for (const selector of bodySelectors) {
            const el = $(selector);
            if (el.length > 0) {
                body = el.text().trim();
                if (body.length > 50) break;
            }
        }

        // Fallback: get all text from the page body and clean it
        if (!body || body.length < 50) {
            body = $('main').text().trim() || $('body').text().trim();
            // Truncate to reasonable length
            body = body.slice(0, 2000);
        }

        // Extract main image
        let imageUrl = article.imageUrl || '';
        if (!imageUrl) {
            const ogImage = $('meta[property="og:image"]').attr('content');
            if (ogImage) {
                imageUrl = ogImage;
            } else {
                // Try to find the first meaningful image
                $('img').each((_, el) => {
                    const src = $(el).attr('src') || '';
                    if (src && !src.includes('logo') && !src.includes('icon') && src.startsWith('http')) {
                        if (!imageUrl) imageUrl = src;
                    }
                });
            }
        }

        return {
            ...article,
            fullBody: body,
            imageUrl,
        };
    } catch (error) {
        console.error(`[Scraper] ❌ Error scraping ${article.url}:`, error);
        return article;
    }
}

/**
 * Scrape multiple articles with rate limiting
 */
export async function scrapeArticles(articles: BinanceArticle[]): Promise<BinanceArticle[]> {
    const results: BinanceArticle[] = [];

    for (const article of articles) {
        const scraped = await scrapeArticleBody(article);
        results.push(scraped);

        // Rate limiting: wait 2-5 seconds between requests
        if (articles.indexOf(article) < articles.length - 1) {
            await sleep(2000 + Math.random() * 3000);
        }
    }

    return results;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
