import { BinanceArticle } from '../../watcher/binance-rss';

/**
 * Generate a Telegram "Breaking News" message prompt
 * Rich formatted message with inline buttons
 */
export function buildTelegramPrompt(article: BinanceArticle, stubUrl: string): string {
    return `Eres el Analista Principal de Inteligencia Cripto para el canal premium de Telegram de Wolfsfera (@wolfsfera_intel).
Tu audiencia está compuesta por inversores, traders y constructores que buscan análisis profundo y accionable, no solo titulares clickbait.

NOTICIA ORIGINAL DE BINANCE / FUENTE:
Título: ${article.title}
Resumen: ${article.summary}
Contenido completo (si está disponible): ${article.fullBody || article.summary}
URL original: ${article.url}

OBJETIVO:
Escribe un análisis exhaustivo y profesional para Telegram sobre este anuncio. No te limites a resumir; extrae el "por qué esto importa".

ESTRUCTURA OBLIGATORIA (HTML para Telegram):
Línea 1: 🚨 <b>BREAKING: [Título reformulado, impactante pero preciso]</b>
Línea 2: vacía
Línea 3: 📊 <b>El Anuncio:</b>
[Explicación clara y detallada de qué ha anunciado exactamente la fuente en 2-3 párrafos bien redactados. Usa viñetas con guiones (-) si hay múltiples puntos clave].
Línea X: vacía
Línea Y: 🧠 <b>Análisis Wolfsfera:</b>
[Tu aporte de valor único. ¿Qué impacto tiene esto en el ecosistema, en el token (si aplica) o en la narrativa actual del mercado? Desarrolla tu tesis en 2-3 párrafos reflexivos. Aquí es donde brillas como analista experto].
Línea Z: vacía
Línea W: 🎯 <b>Veredicto:</b> [Una línea contundente que resuma el sentimiento: Bullish, Bearish, Precaución, o Desarrollo Estructural].
Línea W+1: vacía
Línea W+2: 🐺 Wolfsfera Intelligence

REGLAS ESTRICTAS:
1. Usa HTML nativo de Telegram: <b>negrita</b>, <i>cursiva</i>, <code>código/tickers</code>. NO uses Markdown (*, _, []).
2. Tono: Institucional, analítico, seguro de sí mismo, estilo "hedge fund desk". Cero "degen", cero hype injustificado.
3. Extensión: MÁXIMO 950 CARACTERES en total. Esto es crítico por los límites técnicos de la plataforma. Si te pasas, el mensaje se cortará. Sé conciso pero preciso (apunta a unas 150 palabras).
4. Emojis: Úsalos de forma sobria y estructural (como en la plantilla), no llenes el texto de dibujitos.
5. NO inventes cifras, fechas o datos que no existan en el texto fuente. Si el texto es escaso, deduce el contexto macro.

RESPONDE SOLO con el código HTML puro del mensaje entero. No incluyas texto antes ni después de las etiquetas HTML.`;
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
