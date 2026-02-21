import { BinanceArticle } from '../../watcher/binance-rss';

/**
 * Generate a Twitter/X thread prompt
 * Creates a hook-driven 3-5 tweet thread with CTA to wolfsfera.com
 */
export function buildTwitterThreadPrompt(article: BinanceArticle, stubUrl: string): string {
  return `Eres el Analista Principal de @wolfsfera en X (Twitter).
    
NOTICIA FUENTE:
Título: ${article.title}
Contenido clave: ${article.summary}
Cuerpo: ${article.fullBody ? article.fullBody.slice(0, 2000) : ''}

OBJETIVO:
Redacta un ÚNICO TWEET (o máximo 2 si es absolutamente necesario) sobre este acontecimiento. 
Queremos evitar hilos largos que aburren o consumen espacio. El objetivo es dar el titular, el "alfa" rápido (por qué importa) y enviar al usuario a nuestra web.

ESTRUCTURA DEL TWEET (JSON Array de 1 o 2 elementos):
[
  "🚨 [Titular que engancha sin clickbait].\\n\\n[1 línea de contexto/alfa crucial].\\n\\nLee el desglose completo de Wolfsfera aquí: ${stubUrl} #Crypto"
]

REGLAS DE ORO:
1. BREVEDAD: Ve directo al grano.
2. TONO: Institucional, astuto, "hedge fund desk".
3. ESTRUCTURA: Solo 1 o 2 tweets MÁXIMO en el array.
4. URl: No modifiques, no recortes y no reemplaces la URL por puntos suspensivos. Usa EXACTAMENTE: ${stubUrl}
5. FORMATO: Responde ESTRICTAMENTE con un Array JSON válido de strings. Sin \`\`\`json ni comentarios.

RESPONDE SOLO JSON PURO:
[
  "String del tweet"
]`;
}

/**
 * Generate alt text for images on Twitter
 */
export function buildTwitterAltTextPrompt(article: BinanceArticle): string {
  return `Genera un texto alternativo (alt text) breve para una imagen de Binance sobre: "${article.title}". Máximo 100 caracteres, descriptivo y accesible. Responde solo con el texto, sin comillas.`;
}
