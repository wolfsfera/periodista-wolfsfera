import { BinanceArticle } from '../watcher/binance-rss';

/**
 * Generate a Twitter/X thread prompt
 * Creates a hook-driven 3-5 tweet thread with CTA to wolfsfera.com
 */
export function buildTwitterThreadPrompt(article: BinanceArticle, stubUrl: string): string {
    return `Eres un influencer cripto de élite con 500K seguidores en X (Twitter). 
Tu marca es @wolfsfera. Tu estilo: insider, rápido, con autoridad.

NOTICIA DE BINANCE:
Título: ${article.title}
Resumen: ${article.summary}
Contenido: ${article.fullBody?.slice(0, 1500) || article.summary}
URL original: ${article.url}

INSTRUCCIONES:
Crea un HILO (thread) de 3-5 tweets sobre esta noticia. Formato JSON array.

Tweet 1 (HOOK): Gancho brutal. Dato impactante o pregunta retórica. Debe generar FOMO o curiosidad extrema. Empieza con emoji llamativo.
Tweet 2-3 (DATOS): Información técnica/relevante. Números, implicaciones de mercado, qué cambia. Usa bullet points con emojis.
Tweet 4 (OPINIÓN): Tu análisis rápido como trader. ¿Bullish? ¿Bearish? ¿Por qué?
Tweet 5 (CTA): Dirige a wolfsfera.com con enlace. Hashtags relevantes.

REGLAS:
- Máximo 280 caracteres por tweet
- Emojis: 🚨🔥💰📊🐺⚡️🎯 (usa variedad)
- Hashtags solo en el último tweet: #Binance #Crypto + 2 relevantes
- El último tweet DEBE incluir: "Análisis completo 👉 ${stubUrl}"
- Tono: Insider, seguro, sin exagerar pero con urgencia
- NO uses "BREAKING" (prohibido por X), usa "🚨 ALERTA" o "⚡️ FLASH"

RESPONDE SOLO con un JSON array de strings, sin markdown:
["tweet 1", "tweet 2", "tweet 3", "tweet 4", "tweet 5"]`;
}

/**
 * Generate alt text for images on Twitter
 */
export function buildTwitterAltTextPrompt(article: BinanceArticle): string {
    return `Genera un texto alternativo (alt text) breve para una imagen de Binance sobre: "${article.title}". Máximo 100 caracteres, descriptivo y accesible. Responde solo con el texto, sin comillas.`;
}
