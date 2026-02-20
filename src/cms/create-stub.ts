import { config } from '../config';
import { BinanceArticle } from '../watcher/binance-rss';

/**
 * Create a stub article on wolfsfera.com via the CMS API
 * Returns the URL of the created stub for use in social media CTAs
 */
export async function createCmsStub(article: BinanceArticle, aiContent?: string, preSlug?: string): Promise<string> {
    // Generate a slug if not provided
    const slug = preSlug || generateSlug(article.title);
    const stubUrl = `${config.wolfsferaUrl}/news/${slug}`;

    // If CMS is not configured, return a fallback URL
    if (!config.cmsEnabled) {
        console.log(`[CMS] ⚠️ CMS not configured. Using Wolfsfera homepage as CTA.`);
        return config.wolfsferaUrl;
    }

    try {
        console.log(`[CMS] 📝 Creating article: /news/${slug}`);

        const response = await fetch(`${config.wolfsferaUrl}/api/news`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.wolfsferaCmsSecret}`,
            },
            body: JSON.stringify({
                title: article.title,
                slug,
                summary: article.summary,
                content: aiContent || article.fullBody || article.summary, // Use AI content if available
                sourceUrl: article.url,
                imageUrl: article.imageUrl || '',
                category: article.category,
                publishedAt: article.date,
            }),
        });


        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`[CMS] ⚠️ Stub creation failed (${response.status}): ${errorText}`);
            return config.wolfsferaUrl; // Fallback
        }

        const data = await response.json() as { url?: string };
        console.log(`[CMS] ✅ Stub created: ${data.url || stubUrl}`);
        return data.url || stubUrl;
    } catch (error) {
        console.error('[CMS] ❌ Error creating stub:', error);
        return config.wolfsferaUrl; // Fallback to homepage
    }
}

/**
 * Generate a URL-safe slug from a title
 */
export function generateSlug(title: string): string {
    const base = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9\s-]/g, '')    // Remove special chars
        .replace(/\s+/g, '-')             // Spaces to hyphens
        .replace(/-+/g, '-')              // Collapse multiple hyphens
        .replace(/^-|-$/g, '')            // Trim hyphens
        .slice(0, 60);                     // Max length short to allow hash

    const randomHash = Math.random().toString(36).substring(2, 8);
    return `${base}-${randomHash}`;
}
