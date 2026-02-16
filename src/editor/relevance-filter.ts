import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { BinanceArticle } from '../watcher/binance-rss';

export interface RelevanceScore {
    score: number;          // 1-10
    publishToX: boolean;    // score >= 7
    publishToLinkedin: boolean; // score >= 8
    reason: string;         // Why this score
    category: 'listing' | 'partnership' | 'regulatory' | 'technical' | 'minor';
}

/**
 * Use Gemini AI to score the importance of a Binance article.
 * This determines which platforms receive the content.
 * 
 * - Telegram: ALL news (no filter)
 * - X/Twitter: Only score >= 7 (important news)
 * - LinkedIn: Only score >= 8 (strategic/major news)
 */
export async function scoreRelevance(article: BinanceArticle): Promise<RelevanceScore> {
    try {
        // [BYPASS] User content always gets max score
        if (article.category === 'user-content') {
            const result: RelevanceScore = {
                score: 11,
                publishToX: true,
                publishToLinkedin: true,
                reason: 'Exclusive user content (La Bomba)',
                category: 'technical', // or whatever
            };
            console.log(`[Filter] 🚨 USER CONTENT! Score: ${result.score}/10 | Publishing EVERYWHERE`);
            return result;
        }

        const genAI = new GoogleGenerativeAI(config.geminiApiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Eres un editor jefe de un medio cripto. Evalúa la importancia de esta noticia para decidir si merece publicarse en redes sociales principales (X/Twitter).

NOTICIA:
Título: ${article.title}
Resumen: ${article.summary || 'N/A'}
Categoría detectada: ${article.category}

CRITERIOS DE PUNTUACIÓN (1-10):
- 9-10: Nuevo listado de moneda importante (top 50), partnership estratégico, cambio regulatorio mayor, hackeo significativo
- 7-8: Nuevo listado de moneda menor pero con potencial, actualización importante de producto Binance, movimiento de mercado relevante
- 5-6: Nuevos pares de trading, actualizaciones técnicas menores, delisting
- 1-4: Mantenimiento, actualizaciones de margen/futuros rutinarias, cambios administrativos

REGLA CLAVE: Los "Will Add X on Earn, Buy Crypto, Convert" son RUTINARIOS (score 4-5). Solo los "Will LIST" de monedas nuevas son importantes (score 7+).

RESPONDE SOLO con JSON, sin markdown:
{"score": N, "reason": "razón breve", "category": "listing|partnership|regulatory|technical|minor"}`;

        const response = await model.generateContent(prompt);
        const text = response.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(text);

        const score = Math.min(10, Math.max(1, parsed.score || 5));
        const result: RelevanceScore = {
            score,
            publishToX: score >= 7,
            publishToLinkedin: score >= 8,
            reason: parsed.reason || 'No reason provided',
            category: parsed.category || 'minor',
        };

        const emoji = result.publishToX ? '🔥' : '📋';
        console.log(`[Filter] ${emoji} Score: ${result.score}/10 | X: ${result.publishToX ? '✅' : '❌'} | "${article.title.slice(0, 50)}..." → ${result.reason}`);

        return result;
    } catch (error) {
        console.error('[Filter] ❌ Scoring error, defaulting to Telegram only:', error);
        return {
            score: 5,
            publishToX: false,
            publishToLinkedin: false,
            reason: 'Scoring failed, defaulting to low',
            category: 'minor',
        };
    }
}
