import { TwitterApi } from 'twitter-api-v2';
import fs from 'fs';
import { config } from '../config';
import { ProcessedContent } from '../editor/gemini-processor';

let client: TwitterApi | null = null;

/**
 * Initialize Twitter/X client (lazy singleton)
 */
function getClient(): TwitterApi {
    if (!client) {
        if (!config.xApiKey || !config.xAccessToken) {
            throw new Error('X/Twitter API keys not configured');
        }
        client = new TwitterApi({
            appKey: config.xApiKey,
            appSecret: config.xApiSecret,
            accessToken: config.xAccessToken,
            accessSecret: config.xAccessTokenSecret,
        });
    }
    return client;
}

/**
 * Post a thread (multiple tweets) on X
 */
export async function postTwitterThread(content: ProcessedContent, imagePath?: string): Promise<void> {
    const twitter = getClient();

    if (!content.twitter || content.twitter.thread.length === 0) {
        throw new Error('No Twitter content generated');
    }

    const thread = content.twitter.thread;
    console.log(`[X] 🐦 Posting thread of ${thread.length} tweets...`);

    try {
        let lastTweetId: string | undefined;

        for (let i = 0; i < thread.length; i++) {
            const tweetText = thread[i];
            const isFirst = i === 0;

            // Upload media for the first tweet only
            let mediaId: string | undefined;
            if (isFirst && imagePath && fs.existsSync(imagePath)) {
                try {
                    mediaId = await twitter.v1.uploadMedia(imagePath);
                    console.log('[X] 📷 Media uploaded');
                } catch (mediaError) {
                    console.warn('[X] ⚠️ Media upload failed, posting without image');
                }
            }

            // Build tweet payload
            const payload: any = { text: tweetText };

            if (lastTweetId) {
                payload.reply = { in_reply_to_tweet_id: lastTweetId };
            }

            if (mediaId) {
                payload.media = { media_ids: [mediaId] };
            }

            // Post the tweet
            const result = await twitter.v2.tweet(payload);
            lastTweetId = result.data.id;

            console.log(`[X] ✅ Tweet ${i + 1}/${thread.length}: ${tweetText.slice(0, 50)}...`);

            // Small delay between thread tweets (1-3 seconds)
            if (i < thread.length - 1) {
                await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
            }
        }

        console.log(`[X] ✅ Thread posted: ${thread.length} tweets`);
    } catch (error: any) {
        if (error.code === 429) {
            console.error('[X] 🛑 Rate limited. Try again later.');
        } else if (error.code === 403) {
            console.error('[X] 🛑 Forbidden. Check API permissions and credits.');
        }
        throw error;
    }
}

/**
 * Test X/Twitter connection
 */
export async function testTwitterConnection(): Promise<boolean> {
    try {
        const twitter = getClient();
        const me = await twitter.v2.me();
        console.log(`[X] ✅ Connected as: @${me.data.username}`);
        return true;
    } catch (error) {
        console.error('[X] ❌ Connection test failed:', error);
        return false;
    }
}
