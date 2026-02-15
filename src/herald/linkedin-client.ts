import fs from 'fs';
import { config } from '../config';
import { ProcessedContent } from '../editor/gemini-processor';

/**
 * Post to LinkedIn using the REST API
 * Requires an access token from LinkedIn Developer Portal
 */
export async function postLinkedIn(content: ProcessedContent, imagePath?: string): Promise<void> {
    if (!config.linkedinAccessToken) {
        throw new Error('LinkedIn access token not configured');
    }

    if (!content.linkedin) {
        throw new Error('No LinkedIn content generated');
    }

    console.log('[LinkedIn] 💼 Posting analysis...');

    try {
        // Step 1: Get the authenticated user's ID (URN)
        const meResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${config.linkedinAccessToken}`,
            },
        });

        if (!meResponse.ok) {
            throw new Error(`LinkedIn user info failed: ${meResponse.status}`);
        }

        const meData = await meResponse.json() as { sub: string };
        const personUrn = `urn:li:person:${meData.sub}`;

        // Step 2: Create the post
        const postPayload: any = {
            author: personUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: {
                        text: content.linkedin.post,
                    },
                    shareMediaCategory: 'NONE',
                },
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
        };

        // Step 3: Upload image if available (optional, more complex)
        // For now, we post text-only. Image upload requires a multi-step process.

        const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.linkedinAccessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify(postPayload),
        });

        if (!postResponse.ok) {
            const error = await postResponse.text();
            throw new Error(`LinkedIn post failed: ${postResponse.status} - ${error}`);
        }

        console.log('[LinkedIn] ✅ Post published');
    } catch (error: any) {
        if (error.message?.includes('401')) {
            console.error('[LinkedIn] 🛑 Access token expired. Needs refresh.');
        }
        throw error;
    }
}

/**
 * Test LinkedIn connection
 */
export async function testLinkedInConnection(): Promise<boolean> {
    try {
        if (!config.linkedinAccessToken) {
            console.log('[LinkedIn] ⚠️ No access token configured');
            return false;
        }

        const response = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${config.linkedinAccessToken}`,
            },
        });

        if (response.ok) {
            const data = await response.json() as { name?: string; email?: string };
            console.log(`[LinkedIn] ✅ Connected as: ${data.name || data.email || 'unknown'}`);
            return true;
        }

        console.error(`[LinkedIn] ❌ Connection failed: ${response.status}`);
        return false;
    } catch (error) {
        console.error('[LinkedIn] ❌ Connection test failed:', error);
        return false;
    }
}
