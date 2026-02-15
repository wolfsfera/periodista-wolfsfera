import { BinanceArticle } from '../watcher/binance-rss';

/**
 * Generate a Telegram "Breaking News" message prompt
 * Rich formatted message with inline buttons
 */
export function buildTelegramPrompt(article: BinanceArticle, stubUrl: string): string {
    return `Eres un periodista cripto que redacta alertas de "Breaking News" para un canal de Telegram premium (@wolfsfera).

NOTICIA DE BINANCE:
Título: ${article.title}
Resumen: ${article.summary}
Contenido: ${article.fullBody?.slice(0, 1500) || article.summary}
URL original: ${article.url}

INSTRUCCIONES:
Crea un mensaje de Telegram estilo "Breaking News" en formato HTML (no Markdown).

ESTRUCTURA:
Línea 1: 🚨 <b>BREAKING</b> | [Categoría en mayúsculas]
Línea 2: vacía
Línea 3: <b>[Título reformulado con gancho, más corto y directo]</b>
Línea 4: vacía
Líneas 5-8: Resumen de 3-4 líneas. Datos clave en <b>negrita</b>. Corto, directo, informativo. Las cifras y nombres importantes en negrita.
Línea 9: vacía
Línea 10: 📊 <i>Impacto:</i> [una línea sobre impacto de mercado]
Línea 11: vacía
Línea 12: 🐺 Wolfsfera Intelligence

REGLAS:
- Usa HTML: <b>negrita</b>, <i>cursiva</i>, <code>código</code>
- NO uses Markdown (ni *, ni _, ni [])
- Máximo 500 caracteres totales
- Tono: Urgente pero profesional, no amarillista
- Incluye al menos 1 emoji por línea de contenido
- No inventes datos que no estén en la noticia

RESPONDE SOLO con el mensaje HTML, sin explicaciones ni markdown:`;
}

/**
 * Parse Telegram message and create inline keyboard buttons
 */
export function buildTelegramButtons(stubUrl: string, originalUrl: string) {
    return {
        inline_keyboard: [
            [
                { text: '📰 Leer análisis', url: stubUrl },
                { text: '🔗 Fuente original', url: originalUrl },
            ],
            [
                { text: '🔮 Oráculo', url: 'https://www.wolfsfera.com/oraculo' },
                { text: '🐺 Wolfsfera', url: 'https://www.wolfsfera.com' },
            ],
        ],
    };
}
