import { EmailTrigger } from '../watcher/email-trigger';
import { config } from '../config';

// npm run test:email
// or: npx ts-node src/scripts/check-email.ts

async function main() {
    console.log('📧 Testing Email Connection (IMAP)...');
    console.log(`User: ${config.emailUser}`);
    console.log(`Host: ${config.emailHost}:${config.emailPort}`);

    if (!config.emailEnabled) {
        console.error('❌ Email not configured in .env (EMAIL_USER/PASS/HOST)');
        process.exit(1);
    }

    const trigger = new EmailTrigger();

    console.log('🔌 Connecting...');
    try {
        const emails = await trigger.checkEmails();
        console.log(`✅ Connection SUCCESSFUL!`);
        console.log(`📬 Found ${emails.length} unread emails.`);

        if (emails.length > 0) {
            console.log('----------------------------------------');
            console.log(`First email: "${emails[0].title}"`);
            console.log(`Summary: ${emails[0].summary.slice(0, 50)}...`);
            console.log('----------------------------------------');
            console.log('⚠️ Note: These emails have been marked as SEEN (Read).');
        } else {
            console.log('ℹ️ No unread emails found. Send a test email to yourself and run again.');
        }
    } catch (error) {
        console.error('❌ Connection Failed:', error);
    }
}

main().catch(console.error);
