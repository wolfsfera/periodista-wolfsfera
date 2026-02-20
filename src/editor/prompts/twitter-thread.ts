import { BinanceArticle } from '../../watcher/binance-rss';

/**
 * Generate a Twitter/X thread prompt
 * Creates a hook-driven 3-5 tweet thread with CTA to wolfsfera.com
 */
export function buildTwitterThreadPrompt(article: BinanceArticle, stubUrl: string): string {
    return `Eres el Analista Principal de @wolfsfera en X (Twitter). Tu cuenta es conocida por desgranar noticias cripto complejas, leer entre líneas los comunicados oficiales (como los de Binance) y aportar alfa real sin clickbait barato.

NOTICIA FUENTE:
Título: ${article.title}
Contenido clave: ${article.summary}
Cuerpo (si aplica): ${article.fullBody ? article.fullBody.slice(0, 3000) : ''}

OBJETIVO:
Redacta un hilo analítico, profesional y profundo de 3 a 5 tweets sobre este acontecimiento.

ESTRUCTURA DEL HILO (Formato JSON Array):
{
  "tweets": [
    "Tweet 1 (El Hook Analítico): No uses mayúsculas gritando. Plantea la noticia como un cambio fundamental o un movimiento estratégico. Termina invitando a leer el desglose. 🧵👇",
    "Tweet 2 (El Contexto/Datos): Extrae los datos más duros de la noticia. Fechas, pares de trading, condiciones, montos. Ve al grano.",
    "Tweet 3 (La Tesis Wolfsfera): ¿Por qué es importante esto? ¿Qué narrativa del mercado alimenta? Aporta tu perspectiva de experto.",
    "Tweet 4 (Conclusión y CTA): Cierre profesional. Invita a leer el reporte completo en nuestra plataforma. Incluye este enlace EXACTO al final: ${stubUrl}"
  ]
}

REGLAS DE ORO:
1. TONO: Serio, institucional, astuto. Eres un analista de inteligencia, no un influencer gritón. Cero lenguaje "degen" extremo.
2. LONGITUD: Cada tweet debe aprovechar gran parte de los 280 caracteres, aportando valor real, no relleno.
3. CONEXIÓN: Evita la palabra "HILO" escrita literalmente. Haz que fluyan lógicamente.
4. ETIQUETAS: Usa 1 o 2 hashtags relevantes (ej. #Crypto #Binance) solo en el último o primer tweet.
5. FORMATO DE SALIDA: Debes responder ESTRICTAMENTE con un Array JSON válido de strings. Sin prefijos como "\`\`\`json" ni comentarios adicionales fuera del array.

RESPONDE SOLO JSON PURO:
[
  "String del tweet 1",
  ...
]`;
}

/**
 * Generate alt text for images on Twitter
 */
export function buildTwitterAltTextPrompt(article: BinanceArticle): string {
    return `Genera un texto alternativo (alt text) breve para una imagen de Binance sobre: "${article.title}". Máximo 100 caracteres, descriptivo y accesible. Responde solo con el texto, sin comillas.`;
}
