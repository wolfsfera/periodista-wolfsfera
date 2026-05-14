/**
 * 🐺 WOLFSFERA — X/Twitter Editorial Scheduler
 *
 * Publica en X en 3 franjas horarias al día:
 *   - Mañana     (08:00 – 09:59 hora local): mejor score del pool
 *   - Tarde      (14:00 – 15:59 hora local): segundo mejor del pool
 *   - Tarde-noche(20:00 – 21:59 hora local): la más FRESCA + mejor score
 *
 * Solo artículos con relevance score >= 7 entran al pool.
 * Telegram sigue recibiendo todo en tiempo real (sin cambios).
 *
 * NOTA: Railway corre en UTC. Configura TZ=Europe/Madrid en las env vars
 * para que los horarios sean correctos.
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
    /** Solo guardamos la parte de twitter + imagen para no inflar el JSON */
    twitterContent: Pick<ProcessedContent, 'twitter'>;
    imagePath?: string;
    addedAt: string; // ISO timestamp
}

interface DailySlots {
    date: string;       // YYYY-MM-DD (hora local)
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
}

// ─── Slot definitions ────────────────────────────────────────────────────────

const SLOTS = [
    {
        name: 'morning'   as const,
        hourStart: 8,
        hourEnd: 10,
        label: '🌅 Mañana',
        strategy: 'best-score' as const,
    },
    {
        name: 'afternoon' as const,
        hourStart: 14,
        hourEnd: 16,
        label: '☀️  Tarde',
        strategy: 'best-score' as const,
    },
    {
        name: 'evening'   as const,
        hourStart: 20,
        hourEnd: 24,
        label: '🌙 Tarde-noche',
        strategy: 'freshest-best' as const,
    },
];

// ─── File paths ───────────────────────────────────────────────────────────────

const CANDIDATES_FILE = path.resolve(config.dataDir, 'x-candidates.json');
const SLOTS_FILE      = path.resolve(config.dataDir, 'x-slots.json');

const MIN_SCORE = 7; // Mínimo para entrar al pool de X

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayLocalString(): string {
    // Respeta TZ env var si está configurada en Railway
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
}

function localHour(): number {
    return new Date().getHours();
}

// ─── XScheduler ──────────────────────────────────────────────────────────────

export class XScheduler {
    private candidates: XCandidate[] = [];
    private slots: DailySlots;

    constructor() {
        this.candidates = this.loadCandidates();
        this.slots = this.loadSlots();
        console.log(`[XScheduler] 🗂️  Pool cargado: ${this.candidates.length} candidatos`);
        console.log(`[XScheduler] 📅 Slots hoy (${todayLocalString()}): mañana=${this.slots.morning} tarde=${this.slots.afternoon} noche=${this.slots.evening}`);
    }

    // ── API pública ───────────────────────────────────────────────────────────

    /**
     * Añade un artículo al pool de candidatos para X.
     * Solo se acepta si score >= MIN_SCORE (7).
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
            id,
            title,
            score,
            category,
            source,
            twitterContent: { twitter: content.twitter },
            imagePath,
            addedAt: new Date().toISOString(),
        };

        this.candidates.push(candidate);
        this.saveCandidates();
        console.log(`[XScheduler] 📥 Pool +1 (score ${score}/10): "${title.slice(0, 60)}" | Total: ${this.candidates.length}`);
    }

    /**
     * Comprueba si toca publicar en algún slot y lanza si es así.
     * Llamar en cada ciclo del robot.
     */
    async checkAndPublishSlot(): Promise<void> {
        if (!config.xEnabled) return;

        const today = todayLocalString();
        const hour  = localHour();

        // Reset si es un nuevo día
        if (this.slots.date !== today) {
            this.slots = { date: today, morning: false, afternoon: false, evening: false };
            this.saveSlots();
            console.log(`[XScheduler] 🔄 Nuevo día (${today}) — slots reiniciados`);
        }

        for (const slot of SLOTS) {
            // ¿Ya se publicó hoy en este slot?
            if (this.slots[slot.name]) continue;

            // ¿Estamos dentro de la ventana horaria?
            if (hour < slot.hourStart || hour >= slot.hourEnd) continue;

            console.log(`[XScheduler] ${slot.label} slot activo (hora ${hour}:xx)`);

            const candidate = this.pickCandidate(slot.strategy);
            if (!candidate) {
                console.log(`[XScheduler] 📭 Sin candidatos para ${slot.label} — esperando próximo ciclo`);
                continue;
            }

            console.log(`[XScheduler] 🚀 Publicando en X [${slot.label}]: "${candidate.title.slice(0, 70)}"`);
            console.log(`[XScheduler]    Score: ${candidate.score}/10 | Fuente: ${candidate.source} | Añadido: ${candidate.addedAt}`);

            try {
                // Reconstruir ProcessedContent mínimo para postTwitterThread
                const minimalContent = candidate.twitterContent as ProcessedContent;
                await postTwitterThread(minimalContent, candidate.imagePath);

                this.slots[slot.name] = true;
                this.saveSlots();
                this.removeCandidateById(candidate.id);

                console.log(`[XScheduler] ✅ Slot ${slot.label} completado`);
            } catch (error) {
                console.error(`[XScheduler] ❌ Error publicando slot ${slot.label}:`, error);
            }

            break; // Solo un slot por ciclo
        }
    }

    getStats() {
        return {
            poolSize: this.candidates.length,
            slots: this.slots,
            nextCandidates: this.candidates
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
                .map(c => ({ title: c.title.slice(0, 50), score: c.score, addedAt: c.addedAt })),
        };
    }

    // ── Selección ─────────────────────────────────────────────────────────────

    private pickCandidate(strategy: 'best-score' | 'freshest-best'): XCandidate | null {
        if (this.candidates.length === 0) return null;

        if (strategy === 'freshest-best') {
            // Tarde-noche: prioriza noticias de las últimas 8h; si no hay, el mejor score general
            const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
            const recent = this.candidates.filter(c => c.addedAt >= eightHoursAgo);
            const pool   = recent.length > 0 ? recent : this.candidates;
            // Dentro del pool reciente, mejor score
            return [...pool].sort((a, b) => b.score - a.score)[0];
        }

        // Mañana / Tarde: simplemente el mejor score del pool total
        return [...this.candidates].sort((a, b) => b.score - a.score)[0];
    }

    private removeCandidateById(id: string): void {
        this.candidates = this.candidates.filter(c => c.id !== id);
        this.saveCandidates();
    }

    // ── Persistencia ──────────────────────────────────────────────────────────

    private loadCandidates(): XCandidate[] {
        try {
            if (fs.existsSync(CANDIDATES_FILE)) {
                const data = JSON.parse(fs.readFileSync(CANDIDATES_FILE, 'utf-8'));
                // Limpiar candidatos de más de 48h para no acumular
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

    private loadSlots(): DailySlots {
        try {
            if (fs.existsSync(SLOTS_FILE)) {
                return JSON.parse(fs.readFileSync(SLOTS_FILE, 'utf-8'));
            }
        } catch { /* sin datos previos */ }
        return { date: '', morning: false, afternoon: false, evening: false };
    }

    private saveSlots(): void {
        fs.mkdirSync(path.dirname(SLOTS_FILE), { recursive: true });
        fs.writeFileSync(SLOTS_FILE, JSON.stringify(this.slots, null, 2));
    }
}
