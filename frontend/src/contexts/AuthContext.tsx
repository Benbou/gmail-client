import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, accountsApi } from '@/lib/api';
import type { User, GmailAccount } from '@/types';

interface AuthContextType {
    user: User | null;
    accounts: GmailAccount[];
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, name: string) => Promise<void>;
    logout: () => void;
    connectGmail: () => Promise<void>;
    disconnectGmail: (accountId: string) => Promise<void>;
    refreshAccounts: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [accounts, setAccounts] = useState<GmailAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
            } catch {
                localStorage.removeItem('user');
            }
        }
        setIsLoading(false);
    }, []);

    // Load accounts when user is set
    useEffect(() => {
        if (user) {
            refreshAccounts();
        } else {
            setAccounts([]);
        }
    }, [user?.id]);

    const refreshAccounts = useCallback(async () => {
        if (!user) return;
        try {
            const response = await accountsApi.list(user.id);
            setAccounts(response.data.accounts || []);
        } catch (error) {
            console.error('Failed to load accounts:', error);
        }
    }, [user]);

    const login = async (email: string, name: string) => {
        setIsLoading(true);
        try {
            const response = await authApi.signup({ email, name });
            const newUser = response.data.user;
            setUser(newUser);
            localStorage.setItem('user', JSON.stringify(newUser));
            localStorage.setItem('auth_token', response.data.token || newUser.id);
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setAccounts([]);
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
    };

    const connectGmail = async () => {
        if (!user) throw new Error('User not authenticated');
        try {
            const response = await authApi.startGoogleAuth(user.id);
            // The API returns an OAuth URL - redirect to it
            if (response.data.authUrl) {
                window.location.href = response.data.authUrl;
            }
        } catch (error) {
            console.error('Failed to start Google auth:', error);
            throw error;
        }
    };

    const disconnectGmail = async (accountId: string) => {
        try {
            await authApi.deleteAccount(accountId);
            await refreshAccounts();
        } catch (error) {
            console.error('Failed to disconnect Gmail:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                accounts,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                connectGmail,
                disconnectGmail,
                refreshAccounts,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
