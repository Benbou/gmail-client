import axios, { type AxiosInstance } from 'axios';
import { config } from '../config.js';

const client: AxiosInstance = axios.create({
  baseURL: config.emailengineUrl,
  headers: {
    Authorization: `Bearer ${config.emailengineToken}`,
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

// ── Types ──────────────────────────────────────────────

export interface EEAddress {
  name?: string;
  address: string;
}

export interface EEMessageListItem {
  id: string;
  uid: number;
  emailId: string;
  date: string;
  from: EEAddress;
  to: EEAddress[];
  cc?: EEAddress[];
  bcc?: EEAddress[];
  subject: string;
  messageId: string;
  threadId?: string;
  flags: string[];
  labels?: string[];
  intro?: string;     // snippet / preview text
  text?: {
    id: string;
    encodedSize: { plain?: number; html?: number };
  };
  bounces?: any[];
  isAutoReply?: boolean;
  attachments?: EEAttachment[];
}

export interface EEMessage extends EEMessageListItem {
  text: {
    id: string;
    encodedSize: { plain?: number; html?: number };
    plain?: string;
    html?: string;
    hasMore?: boolean;
  };
  headers?: Record<string, string>;
}

export interface EEAttachment {
  id: string;
  contentType: string;
  encodedSize: number;
  filename?: string;
  inline?: boolean;
  contentId?: string;
}

export interface EEMailbox {
  path: string;
  name: string;
  specialUse?: string;
  listed: boolean;
  subscribed?: boolean;
  delimiter?: string;
  status?: {
    messages?: number;
    unseen?: number;
  };
}

export interface EEAccountInfo {
  account: string;
  name?: string;
  email?: string;
  state?: string;     // connected, connecting, authenticationError, etc.
  path?: string;
  webhooks?: string;
}

export interface EEListResponse<T> {
  total: number;
  page: number;
  pages: number;
  messages: T[];
}

export interface EESearchResponse {
  total: number;
  page: number;
  pages: number;
  messages: EEMessageListItem[];
}

// ── Account management ─────────────────────────────────

export async function createAccount(
  id: string,
  email: string,
  redirectUrl: string,
): Promise<{ url: string }> {
  // Create account with hosted OAuth flow
  const { data } = await client.post('/v1/account', {
    account: id,
    name: email,
    email,
    type: 'gmail',
    oauth2: {
      authorize: true,
      redirectUrl,
    },
    ...(config.emailengineGmailAppId
      ? { oauth2: { authorize: true, redirectUrl, provider: config.emailengineGmailAppId } }
      : {}),
  });
  return { url: data.state || data.redirect || data.url };
}

export async function getAccount(id: string): Promise<EEAccountInfo> {
  const { data } = await client.get(`/v1/account/${id}`);
  return data;
}

export async function deleteAccount(id: string): Promise<void> {
  await client.delete(`/v1/account/${id}`);
}

// ── Messages ───────────────────────────────────────────

export async function listMessages(
  accountId: string,
  options: {
    path?: string;
    page?: number;
    pageSize?: number;
    search?: { query: string };
  } = {},
): Promise<EEListResponse<EEMessageListItem>> {
  const params: Record<string, any> = {
    page: options.page ?? 0,
    pageSize: options.pageSize ?? 50,
  };
  if (options.path) params.path = options.path;

  const { data } = await client.get(`/v1/account/${accountId}/messages`, { params });
  return data;
}

export async function getMessage(
  accountId: string,
  messageId: string,
): Promise<EEMessage> {
  const { data } = await client.get(
    `/v1/account/${accountId}/message/${messageId}`,
    { params: { textType: '*' } },
  );
  return data;
}

export async function submitMessage(
  accountId: string,
  message: {
    from?: EEAddress;
    to: EEAddress[];
    cc?: EEAddress[];
    bcc?: EEAddress[];
    subject: string;
    html?: string;
    text?: string;
    reference?: { message: string; action: 'reply' | 'forward' };
  },
): Promise<{ messageId: string; sendAt?: string }> {
  const { data } = await client.post(`/v1/account/${accountId}/submit`, message);
  return data;
}

// ── Message actions ────────────────────────────────────

export async function moveMessage(
  accountId: string,
  messageId: string,
  path: string,
): Promise<{ path: string; id?: string }> {
  const { data } = await client.put(
    `/v1/account/${accountId}/message/${messageId}/move`,
    { path },
  );
  return data;
}

export async function updateFlags(
  accountId: string,
  messageId: string,
  flags: { add?: string[]; delete?: string[] },
): Promise<{ flags: string[] }> {
  const { data } = await client.put(
    `/v1/account/${accountId}/message/${messageId}`,
    { flags },
  );
  return data;
}

export async function deleteMessage(
  accountId: string,
  messageId: string,
): Promise<{ path: string; id?: string }> {
  return moveMessage(accountId, messageId, '[Gmail]/Trash');
}

// ── Mailboxes (labels) ────────────────────────────────

export async function getMailboxes(accountId: string): Promise<EEMailbox[]> {
  const { data } = await client.get(`/v1/account/${accountId}/mailboxes`);
  return data.mailboxes || data;
}

// ── Search ─────────────────────────────────────────────

export async function searchMessages(
  accountId: string,
  query: string,
  options: { path?: string; page?: number; pageSize?: number } = {},
): Promise<EESearchResponse> {
  const { data } = await client.post(`/v1/account/${accountId}/search`, {
    search: { query },
    path: options.path || 'INBOX',
    page: options.page ?? 0,
    pageSize: options.pageSize ?? 50,
  });
  return data;
}
