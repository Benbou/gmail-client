import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Gmail OAuth scopes
export const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
];

/**
 * Generate OAuth2 authorization URL
 */
export function getAuthUrl(state: string): string {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GMAIL_SCOPES,
        state,
        prompt: 'consent', // Force consent screen to get refresh token
    });
}

/**
 * Exchange authorization code for access & refresh tokens
 */
export async function getTokensFromCode(code: string) {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
}

/**
 * Get Gmail API client with credentials
 */
export function getGmailClient(accessToken: string) {
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Get user's email address from Gmail API
 */
export async function getUserEmail(accessToken: string): Promise<string> {
    const gmail = getGmailClient(accessToken);
    const response = await gmail.users.getProfile({ userId: 'me' });
    return response.data.emailAddress || '';
}
