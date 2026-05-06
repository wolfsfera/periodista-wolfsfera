import imaps, { ImapSimple, ImapSimpleOptions } from 'imap-simple';
import { simpleParser } from 'mailparser';
import { BinanceArticle } from './binance-rss';
import { config } from '../config';

export class EmailTrigger {
    private connection: ImapSimple | null = null;
    private checking: boolean = false;

    constructor() {
        console.log('[EmailTrigger] 📧 Initialized');
    }

    private getOptions(): ImapSimpleOptions | null {
        if (!config.emailUser || !config.emailPass || !config.emailHost) {
            // calculated prop emailEnabled handles this check mostly, but good to double check
            if (!this.checkedOnce) {
                console.warn('[EmailTrigger] ⚠️ EMAIL_USER, EMAIL_PASS, or EMAIL_HOST missing in config. Email trigger disabled.');
                this.checkedOnce = true;
            }
            return null;
        }

        return {
            imap: {
                user: config.emailUser,
                password: config.emailPass,
                host: config.emailHost,
                port: config.emailPort,
                tls: true,
                authTimeout: 3000
            }
        };
    }

    // Add checkedOnce property
    private checkedOnce: boolean = false;

    async checkEmails(): Promise<BinanceArticle[]> {
        const options = this.getOptions();
        if (!options) return [];

        if (this.checking) {
            console.log('[EmailTrigger] ⏳ Already checking emails...');
            return [];
        }

        this.checking = true;
        const articles: BinanceArticle[] = [];

        try {
            console.log('[EmailTrigger] 🔌 Connecting to IMAP...');
            this.connection = await imaps.connect(options);
            await this.connection.openBox('INBOX');

            // Search for UNSEEN messages
            const searchCriteria = ['UNSEEN'];
            const fetchOptions = {
                bodies: ['HEADER', 'TEXT', ''],
                markSeen: true // Mark as read immediately to avoid re-processing
            };

            const messages = await this.connection.search(searchCriteria, fetchOptions);

            if (messages.length > 0) {
                console.log(`[EmailTrigger] 📬 Found ${messages.length} new emails!`);
            }

            for (const item of messages) {
                // Parse the email body
                const all = item.parts.find((part: { which?: string; body?: string }) => part.which === '')?.body;
                if (!all) continue;

                const mail = await simpleParser(all);
                const sender = this.getSender(mail.from?.value[0]?.address);
                const subject = (mail.subject || '').trim();

                if (!this.shouldProcessEmail(sender, subject)) {
                    console.log(`[EmailTrigger] ⏭️ Skipped email from "${sender}" subject "${subject.slice(0, 80)}"`);
                    continue;
                }

                const title = this.cleanTitle(subject || 'Sin Título');
                // Prefer plain text, fallback to html, or empty
                const content = mail.text || mail.html || '';
                if (!content || content.trim().length < 80) {
                    console.log(`[EmailTrigger] ⏭️ Skipped short/empty email "${title}"`);
                    continue;
                }
                // Summary is first 200 chars
                const summary = content.substring(0, 300) + '...';

                // Generate deterministic ID to avoid duplicates across retries/forwards
                const id = this.buildStableId(
                    mail.messageId || '',
                    sender,
                    title,
                    item.attributes.uid?.toString() || ''
                );

                // Construct article
                const article: BinanceArticle = {
                    id: `email-${id}`,
                    title: `[USER POST] ${title}`,
                    // code: `email-${Date.now()}`, // Not in interface
                    date: new Date().toISOString(), // Interface expects string
                    // type: 99, // Not in interface
                    category: 'user-content',
                    // link -> url
                    url: 'https://wolfsfera.com/blog',
                    summary: summary,
                    fullBody: content // Supported optional
                };

                // Add full content to a special field if we want to post FULL content?
                // But the interface is BinanceArticle.
                // We'll trust the summary for now.
                // Ideally, we post the FULL content to the CMS (Wolfsfera)
                // binance-rss doesn't have 'content', only 'summary'.
                // If we want to post full article to CMS, we might need to extend the interface or handle it in index.ts

                // HACK: Store full content in summary just for the CMS posting logic? 
                // Or let the CMS Logic handle it.
                // For Telegram/Twitter, summary is fine.
                // For CMS, we want full text.
                // Let's attach it as a hidden property if needed, but BinanceArticle is strict?
                // No, it's an interface. We can add extra props if we cast.
                // (article as any).fullContent = content; // This is now handled by fullBody

                articles.push(article);
                console.log(`[EmailTrigger] ✅ Processed article: "${title}"`);
            }

        } catch (error) {
            console.error('[EmailTrigger] ❌ Error checking emails:', error);
        } finally {
            if (this.connection) {
                try {
                    this.connection.end();
                } catch (e) { }
            }
            this.checking = false;
        }

        return articles;
    }

    private getSender(address?: string): string {
        return (address || '').trim().toLowerCase();
    }

    private shouldProcessEmail(sender: string, subject: string): boolean {
        const subjectLower = subject.toLowerCase();

        if (config.adminEmail && sender !== config.adminEmail.toLowerCase()) {
            return false;
        }

        if (config.emailAllowedSenders.length > 0 && !config.emailAllowedSenders.includes(sender)) {
            return false;
        }

        if (config.emailBlockedSenders.includes(sender)) {
            return false;
        }

        if (config.emailBlockedSubjectKeywords.some(keyword => keyword && subjectLower.includes(keyword))) {
            return false;
        }

        if (config.emailSubjectPrefix) {
            return subject.startsWith(config.emailSubjectPrefix);
        }

        return true;
    }

    private cleanTitle(title: string): string {
        if (!config.emailSubjectPrefix) return title;
        return title.startsWith(config.emailSubjectPrefix)
            ? title.slice(config.emailSubjectPrefix.length).trim()
            : title;
    }

    private buildStableId(messageId: string, sender: string, subject: string, fallbackUid: string): string {
        const seed = messageId || `${sender}|${subject}` || fallbackUid;
        const normalized = seed.toLowerCase().replace(/[^a-z0-9]/g, '');
        return `email-${normalized.slice(0, 80) || fallbackUid || Date.now().toString()}`;
    }
}
