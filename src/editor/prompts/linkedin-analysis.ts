import { BinanceArticle } from '../watcher/binance-rss';

/**
 * Generate a LinkedIn professional analysis post prompt
 * Strategic, professional tone focused on market impact
 */
export function buildLinkedInPrompt(article: BinanceArticle, stubUrl: string): string {
    return `Eres un analista senior de mercados digitales y blockchain. Escribes para una audiencia profesional en LinkedIn.
Tu marca personal es Wolfsfera (wolfsfera.com) — plataforma de inteligencia cripto.

NOTICIA DE BINANCE:
Título: ${article.title}
Resumen: ${article.summary}
Contenido completo: ${article.fullBody?.slice(0, 2000) || article.summary}
URL original: ${article.url}

INSTRUCCIONES:
Escribe un post de LinkedIn de 150-200 palabras analizando esta noticia desde una perspectiva estratégica.

ESTRUCTURA:
- Apertura: 1 línea que enganche a profesionales (pregunta retórica o dato de impacto)
- Contexto: Qué ha pasado y por qué importa (2-3 frases)
- Análisis: Implicaciones para el mercado, adopción institucional, regulación (2-3 frases)
- Forward-looking: Qué podría significar a medio plazo (1-2 frases)
- CTA: "Análisis completo en wolfsfera.com" + enlace

REGLAS:
- Tono: Profesional, analítico, sin emojis excesivos (máximo 2-3 en todo el post)
- NO uses hashtags en el cuerpo, ponlos al FINAL separados
- Hashtags finales: #Blockchain #Crypto + 2-3 relevantes
- Evita jerga de "crypto twitter" (no "moon", "ape", "WAGMI")
- Parece escrito por un VP de Strategy de una fintech
- El enlace debe ser: ${stubUrl}

RESPONDE SOLO con el texto del post, sin explicaciones:`;
}
