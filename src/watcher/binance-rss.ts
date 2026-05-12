import RssParser from 'rss-parser';

export interface BinanceArticle {
    id: string;
    title: string;
    url: string;
    summary: string;
    date: string;
    category: string;
    imageUrl?: string;
    fullBody?: string;
}

// ── Fuentes RSS con autoridad crypto ─────────────────────────────────────────
const RSS_FEEDS = [
    // Medios de referencia global
    { url: 'https://cointelegraph.com/rss',                         category: 'cointelegraph' },
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',       category: 'coindesk' },
    { url: 'https://decrypt.co/feed',                               category: 'decrypt' },
    { url: 'https://bitcoinist.com/feed/',                          category: 'bitcoinist' },
    // Binance blog oficial (diferente al RSS roto)
    { url: 'https://www.binance.com/en/blog/rss',                   category: 'binance-blog' },
    // Agregador neutral
    { url: 'https://cryptopanic.com/news/rss/',                     category: 'cryptopanic' },
];

const parser = new RssParser({
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    },
});

/**
 * Fetch articles from all configured RSS feeds
 */
export async function fetchCryptoNewsFeeds(): Promise<BinanceArticle[]> {
    const articles: BinanceArticle[] = [];

    for (const feed of RSS_FEEDS) {
        try {
            console.log(`[Watcher] 📡 Fetching RSS: ${feed.url}`);
            const result = await parser.parseURL(feed.url);

            for (const item of result.items) {
                if (!item.title || !item.link) continue;

                const id = Buffer.from(item.link).toString('base64').slice(0, 32);

                let imageUrl = '';
                if (item.enclosure?.url) {
                    imageUrl = item.enclosure.url;
                } else if (item['media:content']?.['$']?.url) {
                    imageUrl = item['media:content']['$'].url;
                }
                if (!imageUrl && item.content) {
                    const imgMatch = item.content.match(/<img[^>]+src="([^"]+)"/);
                    if (imgMatch) imageUrl = imgMatch[1];
                }

                articles.push({
                    id,
                    title: item.title,
                    url: item.link,
                    summary: item.contentSnippet || item.content?.replace(/<[^>]*>/g, '').slice(0, 300) || '',
                    date: item.pubDate || new Date().toISOString(),
                    category: feed.category,
                    imageUrl,
                });
            }

            console.log(`[Watcher] ✅ ${result.items.length} articles from ${feed.category}`);
        } catch (error) {
            console.error(`[Watcher] ❌ RSS error for ${feed.url}:`, error);
        }
    }

    return articles;
}

/**
 * Fetch Binance announcements from their public API (listings, etc.)
 */
export async function fetchBinanceAnnouncements(): Promise<BinanceArticle[]> {
    const articles: BinanceArticle[] = [];

    try {
        console.log('[Watcher] 📡 Fetching Binance announcements API...');

        const response = await fetch(
            'https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?' +
            'type=1&pageNo=1&pageSize=10&catalogId=48',
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json() as {
            data?: {
                catalogs?: Array<{
                    articles?: Array<{
                        id: number;
                        code: string;
                        title: string;
                        body?: string;
                        releaseDate: number;
                    }>;
                }>;
            };
        };

        const catalogArticles = data?.data?.catalogs?.[0]?.articles || [];

        for (const item of catalogArticles) {
            articles.push({
                id: `binance-${item.id}`,
                title: item.title,
                url: `https://www.binance.com/en/support/announcement/${item.code}`,
                summary: item.body?.replace(/<[^>]*>/g, '').slice(0, 300) || '',
                date: new Date(item.releaseDate).toISOString(),
                category: 'binance-listing',
            });
        }

        console.log(`[Watcher] ✅ ${catalogArticles.length} Binance announcements`);
    } catch (error) {
        console.error('[Watcher] ❌ Announcements API error:', error);
    }

    return articles;
}

/**
 * Fetch from all sources — mantiene compatibilidad con index.ts
 */
export async function fetchAllBinanceArticles(): Promise<BinanceArticle[]> {
    const [newsArticles, announcements] = await Promise.all([
        fetchCryptoNewsFeeds(),
        fetchBinanceAnnouncements(),
    ]);

    // Deduplicar por título
    const seen = new Set<string>();
    const all: BinanceArticle[] = [];

    for (const article of [...announcements, ...newsArticles]) {
        const key = article.title.toLowerCase().trim();
        if (!seen.has(key)) {
            seen.add(key);
            all.push(article);
        }
    }

    console.log(`[Watcher] 📊 Total unique articles: ${all.length}`);
    return all;
}
