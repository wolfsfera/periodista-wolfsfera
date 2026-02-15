/**
 * Simple X Test - Text Only
 * Tries to post a simple text tweet to verify if we have ANY access
 */
import { TwitterApi } from 'twitter-api-v2';
import { config } from './config';

async function simpleTest() {
    console.log('🐺 WOLFSFERA — Simple X Text Test');

    const client = new TwitterApi({
        appKey: config.xApiKey,
        appSecret: config.xApiSecret,
        accessToken: config.xAccessToken,
        accessSecret: config.xAccessTokenSecret,
    });

    try {
        console.log('📤 Sending text tweet...');
        // Standard v2 tweet
        const result = await client.v2.tweet('🐺 Wolfsfera Bot - Connection Test ' + Date.now());
        console.log('✅ SUCCESS!', result);
    } catch (error: any) {
        console.error('❌ Failed:', error.code, error.message);
        if (error.data) {
            console.error('Details:', JSON.stringify(error.data, null, 2));
        }
    }
}

simpleTest();
