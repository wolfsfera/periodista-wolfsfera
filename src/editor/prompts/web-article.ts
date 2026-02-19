import { BinanceArticle } from '../../watcher/binance-rss';

/**
 * Generate a Full Web Article prompt
 * detailed, engaging, and SEO-optimized HTML content
 */
export function buildWebArticlePrompt(article: BinanceArticle): string {
    return `Eres el redactor jefe de Wolfsfera (medio cripto líder). Tu misión es convertir esta noticia de Binance en un ARTÍCULO COMPLETO, analítico y magnético.

NOTICIA ORIGINAL:
Título: ${article.title}
Resumen: ${article.summary}
Contenido Base: ${article.fullBody?.slice(0, 2000) || article.summary}
URL: ${article.url}

INSTRUCCIONES:
Escribe un artículo en HTML (sin <html> ni <body>, solo el contenido) de 400-600 palabras.

ESTRUCTURA:
1.  <h2>Gancho Irresistible</h2>: Un subtítulo que explique por qué esto importa AHORA.
2.  <p>Intro</p>: Contexto rápido. Qué ha pasado y qué significa.
3.  <h3>Los Datos Clave</h3>: Lista (<ul> o <ol>) con los puntos técnicos/financieros.
4.  <h3>Análisis Wolfsfera (La opinión del experto)</h3>: ¿Es bullish o bearish? ¿Qué deben hacer los inversores? (Sin consejo financiero directo, pero con "alpha").
5.  <blockquote>Cita destacada o conclusión impactante</blockquote>.
6.  <div class="cta">CTA Final</div>: Invitando a unirse al canal de Telegram o leer más en Wolfsfera.

TONO:
-   Profesional pero con "nervio" (estilo newsletter de pago).
-   Usa negritas (<strong>) para ideas fuerza.
-   NO uses markdown, SOLO HTML limpio.
-   Idioma: Español de España (neutro).

RESPONDE SOLO CON EL CONTENIDO HTML.`;
}
