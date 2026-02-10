import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || '';

// Create axios instance
export const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for auth token (using Supabase session)
api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await supabase.auth.signOut();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// API methods
export const authApi = {
    startGoogleAuth: (userId: string) =>
        api.get(`/auth/google/start?userId=${userId}`),

    deleteAccount: (accountId: string) =>
        api.delete(`/accounts/${accountId}`),
};

export const accountsApi = {
    list: (userId: string) =>
        api.get(`/accounts?userId=${userId}`),
};

export const emailsApi = {
    list: (params: any) =>
        api.get('/emails', { params }),

    get: (id: string, accountId: string) =>
        api.get(`/emails/${id}`, { params: { account_id: accountId } }),

    archive: (id: string, accountId: string) =>
        api.post(`/emails/${id}/archive`, { account_id: accountId }),

    star: (id: string, accountId: string, starred: boolean) =>
        api.post(`/emails/${id}/star`, { account_id: accountId, starred }),

    markRead: (id: string, accountId: string, is_read: boolean) =>
        api.post(`/emails/${id}/read`, { account_id: accountId, is_read }),

    trash: (id: string, accountId: string) =>
        api.post(`/emails/${id}/trash`, { account_id: accountId }),

    snooze: (id: string, accountId: string, until: string) =>
        api.post(`/emails/${id}/snooze`, { account_id: accountId, until }),

    send: (data: {
        gmail_account_id: string;
        to_emails: string[];
        cc_emails?: string[];
        bcc_emails?: string[];
        subject: string;
        body_html: string;
        in_reply_to?: string;
    }) => api.post('/emails/send', data),
};

export const searchApi = {
    search: (query: string, accountId?: string, page = 1, limit = 50) =>
        api.post('/search', { query, account_id: accountId, page, limit }),
};

export const labelsApi = {
    list: (accountId?: string) =>
        api.get('/labels', { params: accountId ? { accountId } : {} }),
};

export const draftsApi = {
    list: (userId: string) =>
        api.get('/drafts', { params: { userId } }),

    get: (id: string) =>
        api.get(`/drafts/${id}`),

    create: (data: {
        gmail_account_id: string;
        to_emails?: string[];
        cc_emails?: string[];
        bcc_emails?: string[];
        subject?: string;
        body_html?: string;
        body_text?: string;
        in_reply_to?: string;
    }) => api.post('/drafts', data),

    update: (id: string, data: {
        to_emails?: string[];
        cc_emails?: string[];
        bcc_emails?: string[];
        subject?: string;
        body_html?: string;
        body_text?: string;
    }) => api.patch(`/drafts/${id}`, data),

    delete: (id: string) =>
        api.delete(`/drafts/${id}`),
};
