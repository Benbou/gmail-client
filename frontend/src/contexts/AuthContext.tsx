import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { authApi, accountsApi } from '@/lib/api';
import type { User, GmailAccount } from '@/types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    accounts: GmailAccount[];
    isLoading: boolean;
    isAuthenticated: boolean;
    logout: () => Promise<void>;
    connectGmail: () => Promise<void>;
    disconnectGmail: (accountId: string) => Promise<void>;
    refreshAccounts: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [accounts, setAccounts] = useState<GmailAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize user from Supabase session
    const initializeUser = useCallback(async (supabaseSession: Session | null) => {
        if (!supabaseSession) {
            setUser(null);
            setAccounts([]);
            setIsLoading(false);
            return;
        }

        try {
            // Get user from Supabase session
            const supabaseUser = supabaseSession.user;

            // Check if user exists in our database
            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('id', supabaseUser.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                // PGRST116 = not found, other errors are real problems
                console.error('Error fetching user:', fetchError);
            }

            if (existingUser) {
                // User exists, use it
                setUser(existingUser);
            } else {
                // Create new user record
                const newUser: Partial<User> = {
                    id: supabaseUser.id,
                    email: supabaseUser.email!,
                    name: supabaseUser.user_metadata.name || supabaseUser.user_metadata.full_name || supabaseUser.email!.split('@')[0],
                    avatar_url: supabaseUser.user_metadata.avatar_url || supabaseUser.user_metadata.picture,
                };

                const { data: createdUser, error: createError } = await supabase
                    .from('users')
                    .insert(newUser)
                    .select()
                    .single();

                if (createError) {
                    console.error('Error creating user:', createError);
                } else {
                    setUser(createdUser);
                }
            }
        } catch (error) {
            console.error('Error initializing user:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load session on mount
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            setSession(currentSession);
            initializeUser(currentSession);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
            initializeUser(newSession);
        });

        return () => subscription.unsubscribe();
    }, [initializeUser]);

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

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setAccounts([]);
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
                session,
                accounts,
                isLoading,
                isAuthenticated: !!user && !!session,
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
