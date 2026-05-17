/**
 * 🐺 WOLFSFERA — X/Twitter Quality Publisher
 *
 * Publica en X cuando llega una noticia con score >= 7, sin restricción horaria.
 * Límites:
 *   - Máximo 5 tweets al día
 *   - Mínimo 2 horas entre tweets (evita ráfagas)
 *   - Score mínimo 7/10 para entrar al pool
 *
 * Telegram sigue recibiendo todo en tiempo real (sin cambios).
 */

import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { ProcessedContent } from '../editor/gemini-processor';
import { postTwitterThread } from './twitter-client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface XCandidate {
    id: string;
    title: string;
    score: number;
    category: string;
    source: string;
    twitterContent: Pick<ProcessedContent, 'twitter'>;
    imagePath?: string;
    addedAt: string; // ISO timestamp
}

interface PublishState {
    date: string;        // YYYY-MM-DD
    dailyCount: number;  // Tweets publicados hoy
    lastPublishedAt: string | null; // ISO timestamp del último tweet
}

// ─── Configuración ────────────────────────────────────────────────────────────

const MAX_DAILY        = 5;                    // Máximo tweets por día
const MIN_GAP_MS       = 2 * 60 * 60 * 1000;  // 2 horas entre tweets
const MIN_SCORE        = 4;                    // Score mínimo para X

// ─── File paths ───────────────────────────────────────────────────────────────

const CANDIDATES_FILE = path.resolve(config.dataDir, 'x-candidates.json');
const STATE_FILE      = path.resolve(config.dataDir, 'x-state.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayLocalString(): string {
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
}

// ─── XScheduler ──────────────────────────────────────────────────────────────

export class XScheduler {
    private candidates: XCandidate[] = [];
    private state: PublishState;

    constructor() {
        this.candidates = this.loadCandidates();
        this.state = this.loadState();
        console.log(`[XScheduler] 🗂️  Pool: ${this.candidates.length} candidatos | Hoy: ${this.state.dailyCount}/${MAX_DAILY} tweets`);
    }

    // ── API pública ───────────────────────────────────────────────────────────

    /**
     * Añade un artículo al pool si score >= MIN_SCORE.
     */
    addCandidate(
        id: string,
        title: string,
        score: number,
        category: string,
        source: string,
        content: ProcessedContent,
        imagePath?: string,
    ): void {
        if (score < MIN_SCORE) {
            console.log(`[XScheduler] ⏭️  Descartado (score ${score}/10 < ${MIN_SCORE}): "${title.slice(0, 60)}"`);
            return;
        }

        if (this.candidates.find(c => c.id === id)) {
            console.log(`[XScheduler] ⏭️  Ya en pool: "${title.slice(0, 60)}"`);
            return;
        }

        if (!content.twitter || content.twitter.thread.length === 0) {
            console.log(`[XScheduler] ⚠️  Sin contenido twitter: "${title.slice(0, 60)}"`);
            return;
        }

        const candidate: XCandidate = {
            id, title, score, category, source,
            twitterContent: { twitter: content.twitter },
            imagePath,
            addedAt: new Date().toISOString(),
        };

        this.candidates.push(candidate);
        this.saveCandidates();
        console.log(`[XScheduler] 📥 Pool +1 (score ${score}/10): "${title.slice(0, 60)}" | Total: ${this.candidates.length}`);
    }

    /**
     * Publica si hay candidatos y se cumplen los límites.
     * Llamar en cada ciclo del robot.
     */
    async checkAndPublish(): Promise<void> {
        if (!config.xEnabled) return;

        const today = todayLocalString();

        // Reset contador si es un nuevo día
        if (this.state.date !== today) {
            this.state = { date: today, dailyCount: 0, lastPublishedAt: null };
            this.saveState();
            console.log(`[XScheduler] 🔄 Nuevo día (${today}) — contador reiniciado`);
        }

        // ¿Límite diario alcanzado?
        if (this.state.dailyCount >= MAX_DAILY) {
            console.log(`[XScheduler] 🛑 Límite diario alcanzado (${MAX_DAILY} tweets)`);
            return;
        }

        // ¿Han pasado 2 horas desde el último tweet?
        if (this.state.lastPublishedAt) {
            const elapsed = Date.now() - new Date(this.state.lastPublishedAt).getTime();
            if (elapsed < MIN_GAP_MS) {
                const waitMin = Math.ceil((MIN_GAP_MS - elapsed) / 60000);
                console.log(`[XScheduler] ⏳ Próximo tweet en ${waitMin} min (gap mínimo 2h)`);
                return;
            }
        }

        // ¿Hay candidatos?
        if (this.candidates.length === 0) return;

        // Elegir el mejor candidato (mayor score, y en empate el más reciente)
        const candidate = [...this.candidates].sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.addedAt.localeCompare(a.addedAt);
        })[0];

        console.log(`[XScheduler] 🚀 Publicando en X: "${candidate.title.slice(0, 70)}"`);
        console.log(`[XScheduler]    Score: ${candidate.score}/10 | Fuente: ${candidate.source} | Añadido: ${candidate.addedAt}`);

        try {
            const minimalContent = candidate.twitterContent as ProcessedContent;
            await postTwitterThread(minimalContent, candidate.imagePath);

            this.state.dailyCount++;
            this.state.lastPublishedAt = new Date().toISOString();
            this.saveState();
            this.removeCandidateById(candidate.id);

            console.log(`[XScheduler] ✅ Publicado (${this.state.dailyCount}/${MAX_DAILY} hoy) | Pool restante: ${this.candidates.length}`);
        } catch (error) {
            console.error(`[XScheduler] ❌ Error publicando:`, error);
        }
    }

    getStats() {
        return {
            poolSize: this.candidates.length,
            dailyCount: this.state.dailyCount,
            maxDaily: MAX_DAILY,
            lastPublishedAt: this.state.lastPublishedAt,
        };
    }

    // ── Privado ───────────────────────────────────────────────────────────────

    private removeCandidateById(id: string): void {
        this.candidates = this.candidates.filter(c => c.id !== id);
        this.saveCandidates();
    }

    private loadCandidates(): XCandidate[] {
        try {
            if (fs.existsSync(CANDIDATES_FILE)) {
                const data = JSON.parse(fs.readFileSync(CANDIDATES_FILE, 'utf-8'));
                const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
                return (data as XCandidate[]).filter(c => c.addedAt >= cutoff);
            }
        } catch { /* sin datos previos */ }
        return [];
    }

    private saveCandidates(): void {
        fs.mkdirSync(path.dirname(CANDIDATES_FILE), { recursive: true });
        fs.writeFileSync(CANDIDATES_FILE, JSON.stringify(this.candidates, null, 2));
    }

    private loadState(): PublishState {
        try {
            if (fs.existsSync(STATE_FILE)) {
                return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
            }
        } catch { /* sin datos previos */ }
        return { date: '', dailyCount: 0, lastPublishedAt: null };
    }

    private saveState(): void {
        fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
        fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
    }
}
