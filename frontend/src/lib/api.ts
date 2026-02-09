import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
            // Handle unauthorized (token expired)
            await supabase.auth.signOut();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// API methods
export const authApi = {
    signup: (data: { email: string; name: string }) =>
        api.post('/auth/signup', data),

    startGoogleAuth: (userId: string) =>
        api.get(`/auth/google/start?userId=${userId}`),

    deleteAccount: (accountId: string) =>
        api.delete(`/auth/google/${accountId}`),
};

export const accountsApi = {
    list: (userId: string) =>
        api.get(`/accounts?userId=${userId}`),

    update: (id: string, data: any) =>
        api.patch(`/accounts/${id}`, data),

    triggerSync: (id: string) =>
        api.post(`/accounts/sync/${id}`),

    getLabels: (accountId: string) =>
        api.get(`/accounts/${accountId}/labels`),
};

export const emailsApi = {
    list: (params: any) =>
        api.get('/emails', { params }),

    get: (id: string) =>
        api.get(`/emails/${id}`),

    update: (id: string, data: any) =>
        api.patch(`/emails/${id}`, data),

    archive: (id: string) =>
        api.post(`/emails/${id}/archive`),

    snooze: (id: string, until: string) =>
        api.post(`/emails/${id}/snooze`, { until }),

    delete: (id: string) =>
        api.delete(`/emails/${id}`),

    // New endpoints for sending emails
    send: (data: {
        gmail_account_id: string;
        to_emails: string[];
        cc_emails?: string[];
        bcc_emails?: string[];
        subject: string;
        body_html: string;
        in_reply_to?: string;
    }) => api.post('/emails/send', data),

    schedule: (data: {
        gmail_account_id: string;
        to_emails: string[];
        cc_emails?: string[];
        bcc_emails?: string[];
        subject: string;
        body_html: string;
        scheduled_at: string;
        in_reply_to?: string;
    }) => api.post('/emails/schedule', data),
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

export const syncApi = {
    trigger: (accountId: string, syncType: 'full' | 'delta' = 'delta') =>
        api.post(`/sync/${accountId}`, { syncType }),

    syncLabels: (accountId: string) =>
        api.post(`/sync/${accountId}/labels`),

    getLogs: (accountId: string, limit = 10) =>
        api.get(`/sync/logs/${accountId}?limit=${limit}`),
};

export const labelsApi = {
    list: (accountId: string) =>
        api.get(`/labels?accountId=${accountId}`),

    get: (id: string) =>
        api.get(`/labels/${id}`),

    create: (data: {
        gmail_account_id: string;
        name: string;
        color?: string;
    }) => api.post('/labels', data),

    update: (id: string, data: {
        name?: string;
        color?: string;
        is_visible?: boolean;
    }) => api.patch(`/labels/${id}`, data),

    delete: (id: string) =>
        api.delete(`/labels/${id}`),
};
