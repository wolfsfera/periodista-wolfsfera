import { BinanceArticle } from '../../watcher/binance-rss';

/**
 * Generate a Twitter/X thread prompt
 * Creates a hook-driven 3-5 tweet thread with CTA to wolfsfera.com
 */
export function buildTwitterThreadPrompt(article: BinanceArticle, stubUrl: string): string {
    return `Eres un "Degen Alpha Hunter" en X (Twitter) con 500K seguidores. Tu audiencia quiere DINERO, RIESGO y OPORTUNIDAD. 
Tu marca es @wolfsfera.

NOTICIA:
${article.title}
${article.summary}

OBJETIVO:
Crea un HILO VIRAL de 3-5 tweets que obligue a la gente a hacer clic.

ESTRUCTURA VISUAL (JSON Array):
Tweet 1: ¡EL GANCHO!
- Empieza con una PREGUNTA o una AFIRMACIÓN POLÉMICA.
- Cero corporativismo. Habla como una persona.
- Emojis: 🧵👇 (al final)

Tweet 2-3: EL ALPHA (Valor)
- ¿Por qué esto pumpea (o dumpea) el precio?
- Datos duros.
- "Esto lo cambia todo porque..."

Tweet 4: LA JUGADA
- Opinión sincera: ¿Bullish? ¿Bearish? ¿Trampa?

Tweet 5: EL CIERRE (CTA)
- "Si quieres adelantarte al mercado, lee el informe completo:"
- Enlace: ${stubUrl}
- Hashtags: #Binance #Bitcoin (o la coin de la noticia)

REGLAS DE ORO:
1.  NO digas "Binance ha anunciado". Di: "🚨 OJO A LO QUE ACABA DE PASAR".
2.  Usa saltos de línea para que sea legible.
3.  Sé corto. 240 caracteres max.
4.  NO suenes como un bot de noticias. Suena como un insider.

RESPONDE SOLO JSON: ["tweet1", "tweet2", ...]`;
}

/**
 * Generate alt text for images on Twitter
 */
export function buildTwitterAltTextPrompt(article: BinanceArticle): string {
    return `Genera un texto alternativo (alt text) breve para una imagen de Binance sobre: "${article.title}". Máximo 100 caracteres, descriptivo y accesible. Responde solo con el texto, sin comillas.`;
}
