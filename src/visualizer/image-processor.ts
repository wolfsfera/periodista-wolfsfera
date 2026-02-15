import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

interface ProcessedImage {
    twitter?: string;     // path to 16:9 image
    linkedin?: string;    // path to 1:1 image
    telegram?: string;    // path to original-ratio image
    original?: string;    // path to original download
}

/**
 * The Visualizer — downloads, resizes, and watermarks images
 * for each social media platform
 */
export class ImageProcessor {
    private tempDir: string;

    constructor() {
        this.tempDir = path.join(config.dataDir, 'images');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Process an image URL into platform-optimized versions
     */
    async processImage(imageUrl: string, articleId: string): Promise<ProcessedImage> {
        const result: ProcessedImage = {};

        if (!imageUrl) {
            console.log('[Visualizer] ⚠️ No image URL provided, skipping');
            return result;
        }

        try {
            // Download original
            console.log(`[Visualizer] 🎨 Downloading: ${imageUrl.slice(0, 80)}...`);
            const buffer = await this.downloadImage(imageUrl);
            if (!buffer) return result;

            const originalPath = path.join(this.tempDir, `${articleId}_original.jpg`);
            fs.writeFileSync(originalPath, buffer);
            result.original = originalPath;

            // Create watermark overlay (text-based, lightweight)
            const watermarkSvg = this.createWatermarkSvg();

            // Twitter: 1200x675 (16:9)
            if (config.xEnabled) {
                const twitterPath = path.join(this.tempDir, `${articleId}_twitter.jpg`);
                await sharp(buffer)
                    .resize(1200, 675, { fit: 'cover', position: 'center' })
                    .composite([{ input: Buffer.from(watermarkSvg), gravity: 'southeast' }])
                    .jpeg({ quality: 85 })
                    .toFile(twitterPath);
                result.twitter = twitterPath;
                console.log('[Visualizer] ✅ Twitter image (1200x675)');
            }

            // LinkedIn: 1200x1200 (1:1)
            if (config.linkedinEnabled) {
                const linkedinPath = path.join(this.tempDir, `${articleId}_linkedin.jpg`);
                await sharp(buffer)
                    .resize(1200, 1200, { fit: 'cover', position: 'center' })
                    .composite([{ input: Buffer.from(watermarkSvg), gravity: 'southeast' }])
                    .jpeg({ quality: 85 })
                    .toFile(linkedinPath);
                result.linkedin = linkedinPath;
                console.log('[Visualizer] ✅ LinkedIn image (1200x1200)');
            }

            // Telegram: max 1280px wide, keep ratio
            if (config.telegramEnabled) {
                const telegramPath = path.join(this.tempDir, `${articleId}_telegram.jpg`);
                await sharp(buffer)
                    .resize(1280, null, { fit: 'inside', withoutEnlargement: true })
                    .composite([{ input: Buffer.from(watermarkSvg), gravity: 'southeast' }])
                    .jpeg({ quality: 85 })
                    .toFile(telegramPath);
                result.telegram = telegramPath;
                console.log('[Visualizer] ✅ Telegram image (max 1280w)');
            }

        } catch (error) {
            console.error('[Visualizer] ❌ Image processing error:', error);
        }

        return result;
    }

    /**
     * Download image buffer from URL
     */
    private async downloadImage(url: string): Promise<Buffer | null> {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                },
            });

            if (!response.ok) {
                console.warn(`[Visualizer] ⚠️ Failed to download image: HTTP ${response.status}`);
                return null;
            }

            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error) {
            console.error('[Visualizer] ❌ Download error:', error);
            return null;
        }
    }

    /**
     * Create a subtle SVG watermark
     */
    private createWatermarkSvg(): string {
        return `<svg width="200" height="30" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="200" height="30" rx="4" fill="rgba(0,0,0,0.5)"/>
            <text x="100" y="20" font-family="Arial, sans-serif" font-size="13"
                  font-weight="bold" fill="rgba(255,255,255,0.8)"
                  text-anchor="middle">🐺 wolfsfera.com</text>
        </svg>`;
    }

    /**
     * Clean up temp images older than 24h
     */
    cleanup(): void {
        try {
            const files = fs.readdirSync(this.tempDir);
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24h

            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > maxAge) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch (error) {
            // Silent cleanup
        }
    }
}
